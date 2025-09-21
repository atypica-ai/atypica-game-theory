import { loadEnvConfig } from "@next/env";

// Parse command line arguments
const args = process.argv.slice(2);
const siteIndex = args.indexOf("--site");
const API_BASE =
  siteIndex !== -1 && args[siteIndex + 1] ? args[siteIndex + 1] : "http://localhost:3000";
const shouldCreateViaAPI = args.includes("--create-monitors");
const shouldOverride = args.includes("--override");

const APIS = [
  // Ping Service
  "ping",
  // Database
  "database",
  // Browser APIs
  "htmlToPdf",
  // Email Service
  "sendEmail",
  // AI Services
  "embedding",
  // LLM Models
  "claude",
  "gpt",
  "gemini",
  // Transcription
  "whisper",
  // Social Tools
  "xhsSearch",
  "dySearch",
  "insSearch",
  "tiktokSearch",
  "twitterSearch",
];

const API_DESCRIPTIONS = {
  xhsSearch: "XHS Search",
  dySearch: "Douyin Search",
  insSearch: "Instagram Search",
  tiktokSearch: "TikTok Search",
  twitterSearch: "Twitter Search",
  htmlToPdf: "HTML to PDF Function",
  sendEmail: "Email API",
  embedding: "Text Embedding API",
  ping: "Ping",
  database: "Database Connection",
  claude: "Claude API",
  gpt: "GPT API",
  gemini: "Gemini API",
  whisper: "Whisper Transcription",
};

const API_GROUPS = {
  Website: ["sendEmail", "ping", "database"],
  "Social Agents": ["xhsSearch", "dySearch", "insSearch", "tiktokSearch", "twitterSearch"],
  "Edge Functions": ["htmlToPdf"],
  "Study Agent": ["claude"],
  Persona: ["embedding", "gpt"],
  Interview: ["whisper"],
  Report: ["gemini"],
};

async function testApi(apiName: string) {
  try {
    // Special URL handling for ping
    const testUrl = apiName === "ping" ? `${API_BASE}/.ping` : `${API_BASE}/api/health/${apiName}`;

    const response = await fetch(testUrl);
    const data = await response.json();

    const icon = response.status === 200 ? "✅" : "❌";
    const status = response.status === 200 ? "HEALTHY" : "UNHEALTHY";

    console.log(`[${apiName}] ${icon} ${status} (${response.status})`);
    console.log(`  Status: ${data.status}`);

    if (data.error) {
      console.log(`  Error: ${data.error}`);
    }

    if (data.result) {
      // Social tools result
      if (data.result.notes || data.result.posts) {
        const { notes, posts } = data.result;
        const count = (notes?.length || 0) + (posts?.length || 0);
        console.log(`  Results: ${count} items`);
      }
      // Browser API result
      else if (data.result.status !== undefined) {
        console.log(`  Response: ${data.result.status} ${data.result.statusText}`);
        if (data.result.url) {
          console.log(`  Test URL: ${data.result.url}`);
        }
        if (data.result.size) {
          console.log(`  Size: ${data.result.size} bytes`);
        }
      }
      // Email service result
      else if (data.result.message) {
        console.log(`  Message: ${data.result.message}`);
      }
      // Embedding service result
      else if (data.result.dimension !== undefined) {
        console.log(`  Dimension: ${data.result.dimension}`);
        console.log(`  Sample: [${data.result.sample.join(", ")}]`);
      }
    }

    console.log("");
  } catch (error) {
    console.log(`[${apiName}] ❌ CONNECTION ERROR`);
    console.log(`  Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    console.log("");
  }
}

async function createMonitorsViaAPI() {
  const uptimeKumaUrl = process.env.UPTIME_KUMA_API_URL;
  const username = process.env.UPTIME_KUMA_USERNAME;
  const password = process.env.UPTIME_KUMA_PASSWORD;

  if (!uptimeKumaUrl || !username || !password) {
    console.error("❌ Missing required environment variables:");
    console.error("   UPTIME_KUMA_API_URL, UPTIME_KUMA_USERNAME, UPTIME_KUMA_PASSWORD");
    return;
  }

  try {
    // Dynamic import of socket.io-client
    const { io } = await import("socket.io-client");

    console.log(`🔗 Connecting to Uptime Kuma at ${uptimeKumaUrl}`);
    const socket = io(uptimeKumaUrl);

    return new Promise<void>((resolve, reject) => {
      socket.on("connect", () => {
        console.log("✅ Connected to Uptime Kuma");

        // Listen for monitorList event (sent automatically after authentication)
        let monitorListReceived = false;
        socket.on("monitorList", (monitorListData: any) => {
          if (monitorListReceived) return;
          monitorListReceived = true;
          console.log("📋 Received monitor list from server");
          createAllMonitors(monitorListData);
        });

        // Login with username and password
        socket.emit("login", { username, password }, (response: any) => {
          if (response.ok) {
            console.log("✅ Authenticated successfully");
            // Don't call createAllMonitors here - wait for monitorList event
            // Set a timeout in case monitorList is not received
            setTimeout(() => {
              if (!monitorListReceived) {
                console.log("⏰ No monitorList received, proceeding with empty list");
                createAllMonitors({});
              }
            }, 3000);
          } else {
            console.error("❌ Authentication failed:", response.msg);
            socket.disconnect();
            reject(new Error("Authentication failed"));
          }
        });
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Connection failed:", error.message);
        reject(error);
      });

      let createdCount = 0;

      function createAllMonitors(existingMonitors: any) {
        // Extract site name for group
        const siteName = API_BASE.replace(/^https?:\/\//, "").replace(/:\d+$/, "");

        console.log(`🔍 Processing ${Object.keys(existingMonitors).length} existing monitors`);

        if (shouldOverride) {
          console.log("🗑️ Override mode: deleting all existing monitors and groups first");
          deleteAllMonitors(existingMonitors, () => {
            // After deletion, proceed with clean creation
            processMonitorList({});
          });
        } else {
          processMonitorList(existingMonitors);
        }
      }

      function deleteAllMonitors(existingMonitors: any, callback: () => void) {
        const monitors = [];
        const groups = [];

        // Separate monitors and groups
        for (const [id, monitor] of Object.entries(existingMonitors)) {
          const mon = monitor as any;
          if (mon?.type === "group") {
            groups.push({ id: parseInt(id), ...mon });
          } else {
            monitors.push({ id: parseInt(id), ...mon });
          }
        }

        console.log(`🗑️ Found ${monitors.length} monitors and ${groups.length} groups to delete`);

        let deletedCount = 0;
        const totalToDelete = monitors.length + groups.length;

        if (totalToDelete === 0) {
          console.log("✅ No monitors or groups to delete");
          callback();
          return;
        }

        // Function to handle deletion completion
        const checkDeletionComplete = () => {
          deletedCount++;
          if (deletedCount === totalToDelete) {
            console.log(`✅ Deleted all ${totalToDelete} items`);
            callback();
          }
        };

        // Delete monitors first (they may have parent dependencies)
        monitors.forEach((monitor) => {
          socket.emit("deleteMonitor", monitor.id, (response: any) => {
            if (response.ok) {
              console.log(`🗑️ Deleted monitor: ${monitor.name} (ID: ${monitor.id})`);
            } else {
              console.error(`❌ Failed to delete monitor: ${monitor.name} - ${response.msg}`);
            }
            checkDeletionComplete();
          });
        });

        // Delete groups after monitors
        groups.forEach((group) => {
          socket.emit("deleteMonitor", group.id, (response: any) => {
            if (response.ok) {
              console.log(`🗑️ Deleted group: ${group.name} (ID: ${group.id})`);
            } else {
              console.error(`❌ Failed to delete group: ${group.name} - ${response.msg}`);
            }
            checkDeletionComplete();
          });
        });
      }

      function processMonitorList(monitorListResponse: any) {
        console.log(
          `🔍 Processing monitor list with ${Object.keys(monitorListResponse || {}).length} items`,
        );

        // Handle different possible response structures
        let existingMonitors: Record<string, any> = {};
        if (Array.isArray(monitorListResponse)) {
          // If it's an array, convert to object with id as key
          monitorListResponse.forEach((monitor: any, index: number) => {
            existingMonitors[monitor.id || index] = monitor;
          });
        } else if (typeof monitorListResponse === "object" && monitorListResponse !== null) {
          existingMonitors = monitorListResponse;
        }

        const siteName = API_BASE.replace(/^https?:\/\//, "").replace(/:\d+$/, "");
        console.log(`🔍 Looking for existing group with name: "${siteName}"`);
        console.log(`📋 Found ${Object.keys(existingMonitors).length} existing monitors/groups:`);

        // List all items for debugging
        const groups = [];
        for (const [id, monitor] of Object.entries(existingMonitors)) {
          const mon = monitor as any;
          console.log(
            `   ${mon?.type === "group" ? "📁" : "🔍"} ${mon?.type || "unknown"}: "${mon?.name || "unnamed"}" (ID: ${id})`,
          );
          if (mon?.type === "group") {
            groups.push({ id: parseInt(id), ...mon });
          }
        }

        console.log(`📁 Found ${groups.length} groups total`);

        // Find existing group by name (case-insensitive and flexible matching)
        let existingGroup = null;
        for (const group of groups) {
          // Try multiple matching strategies
          const isExactMatch = group.name === siteName;
          const isCaseInsensitiveMatch = group.name?.toLowerCase() === siteName.toLowerCase();
          const containsMatch =
            group.name?.includes(siteName) || siteName.includes(group.name || "");

          console.log(
            `   Checking group "${group.name}": exact=${isExactMatch}, case=${isCaseInsensitiveMatch}, contains=${containsMatch}`,
          );

          if (isExactMatch || isCaseInsensitiveMatch || containsMatch) {
            existingGroup = group;
            console.log(`✅ Found matching group: "${group.name}" (ID: ${group.id})`);
            break;
          }
        }

        if (existingGroup) {
          console.log(`📁 Found existing group: ${existingGroup.name} (ID: ${existingGroup.id})`);

          // Update existing main group
          const updatedGroup = {
            id: existingGroup.id,
            name: existingGroup.name,
            type: "group",
            active: true,
            interval: 600,
            retryInterval: 300,
            maxretries: 0,
            upsideDown: false,
            maxredirects: 10,
            accepted_statuscodes: [],
            notificationIDList: {},
            conditions: "[]",
          };

          console.log(`🔄 Updating main group: ${existingGroup.name}`);
          socket.emit("editMonitor", updatedGroup, (updateResponse: any) => {
            if (updateResponse.ok) {
              console.log(`✅ Updated main group: ${existingGroup.name} (ID: ${existingGroup.id})`);
            } else {
              console.error(`❌ Failed to update main group: ${existingGroup.name} - ${updateResponse.msg}`);
            }
          });

          createSubGroups(existingGroup.id, existingMonitors);
        } else {
          // Create new main group
          const group = {
            name: siteName,
            type: "group",
            active: true,
            interval: 600,
            retryInterval: 300,
            maxretries: 0,
            upsideDown: false,
            maxredirects: 10,
            accepted_statuscodes: [],
            notificationIDList: {},
            conditions: "[]",
          };

          console.log(`📁 Creating new main group: ${group.name}`);
          socket.emit("add", group, (groupResponse: any) => {
            if (groupResponse.ok) {
              const groupId = groupResponse.monitorID;
              console.log(`✅ Created main group: ${group.name} (ID: ${groupId})`);
              createSubGroups(groupId, existingMonitors);
            } else {
              console.error(`❌ Failed to create main group: ${group.name} - ${groupResponse.msg}`);
              socket.disconnect();
              reject(new Error("Failed to create main group"));
            }
          });
        }
      }

      function createSubGroups(mainGroupId: number, existingMonitors: any) {
        const subGroups = Object.keys(API_GROUPS);
        const subGroupIds: Record<string, number> = {};
        let createdSubGroups = 0;

        console.log(
          `📁 Creating ${subGroups.length} sub-groups under main group (ID: ${mainGroupId})`,
        );

        subGroups.forEach((subGroupName) => {
          // Check if sub-group already exists
          let existingSubGroup = null;
          for (const [id, monitor] of Object.entries(existingMonitors)) {
            const mon = monitor as any;
            if (
              mon?.type === "group" &&
              mon?.name === subGroupName &&
              mon?.parent === mainGroupId
            ) {
              existingSubGroup = { id: parseInt(id), ...mon };
              break;
            }
          }

          if (existingSubGroup) {
            console.log(
              `📁 Found existing sub-group: ${subGroupName} (ID: ${existingSubGroup.id})`,
            );

            // Update existing sub-group
            const updatedSubGroup = {
              id: existingSubGroup.id,
              name: subGroupName,
              type: "group",
              parent: mainGroupId,
              active: true,
              interval: 600,
              retryInterval: 300,
              maxretries: 0,
              upsideDown: false,
              maxredirects: 10,
              accepted_statuscodes: [],
              notificationIDList: {},
              conditions: "[]",
            };

            console.log(`🔄 Updating sub-group: ${subGroupName}`);
            socket.emit("editMonitor", updatedSubGroup, (updateResponse: any) => {
              if (updateResponse.ok) {
                console.log(`✅ Updated sub-group: ${subGroupName} (ID: ${existingSubGroup.id})`);
              } else {
                console.error(`❌ Failed to update sub-group: ${subGroupName} - ${updateResponse.msg}`);
              }
            });

            subGroupIds[subGroupName] = existingSubGroup.id;
            createdSubGroups++;

            if (createdSubGroups === subGroups.length) {
              createOrUpdateMonitors(subGroupIds, existingMonitors);
            }
          } else {
            // Create new sub-group
            const subGroup = {
              name: subGroupName,
              type: "group",
              parent: mainGroupId,
              active: true,
              interval: 600,
              retryInterval: 300,
              maxretries: 0,
              upsideDown: false,
              maxredirects: 10,
              accepted_statuscodes: [],
              notificationIDList: {},
              conditions: "[]",
            };

            console.log(`📁 Creating sub-group: ${subGroupName}`);
            socket.emit("add", subGroup, (response: any) => {
              if (response.ok) {
                console.log(`✅ Created sub-group: ${subGroupName} (ID: ${response.monitorID})`);
                subGroupIds[subGroupName] = response.monitorID;
              } else {
                console.error(`❌ Failed to create sub-group: ${subGroupName} - ${response.msg}`);
              }

              createdSubGroups++;
              if (createdSubGroups === subGroups.length) {
                createOrUpdateMonitors(subGroupIds, existingMonitors);
              }
            });
          }
        });
      }

      function createOrUpdateMonitors(subGroupIds: Record<string, number>, existingMonitors: any) {
        let processedCount = 0;

        APIS.forEach((apiName) => {
          const monitorName = API_DESCRIPTIONS[apiName as keyof typeof API_DESCRIPTIONS];

          // Find which sub-group this API belongs to
          let parentGroupId = 0;
          let parentGroupName = "";
          for (const [groupName, apis] of Object.entries(API_GROUPS) as [string, string[]][]) {
            if (apis.includes(apiName)) {
              parentGroupId = subGroupIds[groupName];
              parentGroupName = groupName;
              break;
            }
          }

          if (!parentGroupId) {
            console.error(`❌ No sub-group found for API: ${apiName}`);
            processedCount++;
            if (processedCount === APIS.length) {
              console.log(
                `\n✨ Monitor processing completed: ${processedCount} monitors processed`,
              );
              socket.disconnect();
              resolve();
            }
            return;
          }

          // Check if monitor already exists in this sub-group
          let existingMonitor = null;
          for (const [id, monitor] of Object.entries(existingMonitors)) {
            const mon = monitor as any;
            if (mon.name === monitorName && mon.parent === parentGroupId) {
              existingMonitor = { id: parseInt(id), ...mon };
              break;
            }
          }

          // Special URL handling for ping
          const monitorUrl =
            apiName === "ping" ? `${API_BASE}/.ping` : `${API_BASE}/api/health/${apiName}`;

          // Set different intervals based on API type
          let interval = 1800; // 30 minutes default
          if (apiName === "xhsSearch") {
            interval = 3600; // 1 hour for XHS (小红书)
          } else if (apiName === "dySearch") {
            interval = 7200; // 2 hours for Douyin (抖音)
          }

          const monitorConfig = {
            name: monitorName,
            type: "http",
            url: monitorUrl,
            method: "GET",
            interval: interval,
            retryInterval: 300, // 5 minutes
            maxretries: 3,
            timeout: 90,
            active: true,
            ignoreTls: false,
            upsideDown: false,
            maxredirects: 10,
            accepted_statuscodes: ["200-299"],
            dns_resolve_type: "A",
            dns_resolve_server: "1.1.1.1",
            expiryNotification: false,
            notificationIDList: {},
            parent: parentGroupId,
            conditions: "[]",
          };

          if (existingMonitor) {
            // Update existing monitor
            const updateConfig = { ...monitorConfig, id: existingMonitor.id };
            socket.emit("editMonitor", updateConfig, (response: any) => {
              if (response.ok) {
                console.log(
                  `🔄 Updated monitor: ${monitorName} in ${parentGroupName} (ID: ${existingMonitor.id})`,
                );
              } else {
                console.error(`❌ Failed to update monitor: ${monitorName} - ${response.msg}`);
              }

              processedCount++;
              if (processedCount === APIS.length) {
                console.log(
                  `\n✨ Monitor processing completed: ${processedCount} monitors processed`,
                );
                socket.disconnect();
                resolve();
              }
            });
          } else {
            // Create new monitor
            socket.emit("add", monitorConfig, (response: any) => {
              if (response.ok) {
                console.log(
                  `✅ Created monitor: ${monitorName} in ${parentGroupName} (ID: ${response.monitorID})`,
                );
              } else {
                console.error(`❌ Failed to create monitor: ${monitorName} - ${response.msg}`);
              }

              processedCount++;
              if (processedCount === APIS.length) {
                console.log(
                  `\n✨ Monitor processing completed: ${processedCount} monitors processed`,
                );
                socket.disconnect();
                resolve();
              }
            });
          }
        });
      }
    });
  } catch (error) {
    console.error("❌ Error creating monitors:", error);
    console.log("💡 Make sure to install socket.io-client: npm install socket.io-client");
  }
}

async function main() {
  loadEnvConfig(process.cwd());

  if (shouldCreateViaAPI) {
    await createMonitorsViaAPI();
    return;
  }

  console.log(`🔍 Testing API Health Status (${API_BASE})\n`);

  for (const apiName of APIS) {
    await testApi(apiName);
  }

  console.log("✨ Health check completed");
}

main().catch(console.error);
