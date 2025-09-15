import { loadEnvConfig } from "@next/env";

// Parse command line arguments
const args = process.argv.slice(2);
const siteIndex = args.indexOf("--site");
const API_BASE =
  siteIndex !== -1 && args[siteIndex + 1] ? args[siteIndex + 1] : "http://localhost:3000";
const shouldExport = args.includes("--export");
const shouldCreateViaAPI = args.includes("--create-monitors");

const APIS = [
  // Social Tools
  "xhsSearch",
  "dySearch",
  "insSearch",
  "tiktokSearch",
  "twitterSearch",
  // Browser APIs
  "htmlToPdf",
  // Email Service
  "sendEmail",
  // AI Services
  "embedding",
];

const API_DESCRIPTIONS = {
  xhsSearch: "XHS Search Service",
  dySearch: "Douyin Search Service",
  insSearch: "Instagram Search Service",
  tiktokSearch: "TikTok Search Service",
  twitterSearch: "Twitter Search Service",
  htmlToPdf: "HTML to PDF Service",
  sendEmail: "Email Service",
  embedding: "Text Embedding Service",
};

async function testApi(apiName: string) {
  try {
    const response = await fetch(`${API_BASE}/api/health/${apiName}`);
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

function generateUptimeKumaConfig() {
  const monitors = APIS.map((apiName, index) => ({
    id: index + 1,
    name: API_DESCRIPTIONS[apiName as keyof typeof API_DESCRIPTIONS],
    description: null,
    pathName: API_DESCRIPTIONS[apiName as keyof typeof API_DESCRIPTIONS],
    parent: null,
    childrenIDs: [],
    url: `${API_BASE}/api/health/${apiName}`,
    method: "GET",
    hostname: null,
    port: null,
    maxretries: 3,
    weight: 2000,
    active: true,
    forceInactive: false,
    type: "http",
    timeout: 30,
    interval: 1800, // 30 minutes
    retryInterval: 300, // 5 minutes
    resendInterval: 0,
    keyword: null,
    invertKeyword: false,
    expiryNotification: true,
    ignoreTls: false,
    upsideDown: false,
    packetSize: 56,
    maxredirects: 10,
    accepted_statuscodes: ["200-299"],
    dns_resolve_type: "A",
    dns_resolve_server: "1.1.1.1",
    dns_last_result: null,
    docker_container: "",
    docker_host: null,
    proxyId: null,
    notificationIDList: {},
    tags: [],
    maintenance: false,
    mqttTopic: "",
    mqttSuccessMessage: "",
    databaseQuery: null,
    authMethod: null,
    grpcUrl: null,
    grpcProtobuf: null,
    grpcMethod: null,
    grpcServiceName: null,
    grpcEnableTls: false,
    radiusCalledStationId: null,
    radiusCallingStationId: null,
    game: null,
    gamedigGivenPortOnly: true,
    httpBodyEncoding: "json",
    jsonPath: null,
    expectedValue: null,
    kafkaProducerTopic: null,
    kafkaProducerBrokers: [],
    kafkaProducerSsl: false,
    kafkaProducerAllowAutoTopicCreation: false,
    kafkaProducerMessage: null,
    screenshot: null,
    headers: null,
    body: null,
    grpcBody: null,
    grpcMetadata: null,
    basic_auth_user: null,
    basic_auth_pass: null,
    oauth_client_id: null,
    oauth_client_secret: null,
    oauth_token_url: null,
    oauth_scopes: null,
    oauth_auth_method: "client_secret_basic",
    pushToken: null,
    databaseConnectionString: null,
    radiusUsername: null,
    radiusPassword: null,
    radiusSecret: null,
    mqttUsername: "",
    mqttPassword: "",
    authWorkstation: null,
    authDomain: null,
    tlsCa: null,
    tlsCert: null,
    tlsKey: null,
    kafkaProducerSaslOptions: {
      mechanism: "None",
    },
    includeSensitiveData: true,
  }));

  return {
    version: "1.23.3",
    notificationList: [],
    monitorList: monitors,
    tagList: [],
  };
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

        // Login with username and password
        socket.emit("login", { username, password }, (response: any) => {
          if (response.ok) {
            console.log("✅ Authenticated successfully");
            createAllMonitors();
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

      function createAllMonitors() {
        // Extract site name for group
        const siteName = API_BASE.replace(/^https?:\/\//, "").replace(/:\d+$/, "");

        // First, create the group
        const group = {
          name: siteName,
          type: "group",
          active: true,
          interval: 60,
          retryInterval: 60,
          maxretries: 0,
          timeout: 48,
          ignoreTls: false,
          upsideDown: false,
          maxredirects: 10,
          accepted_statuscodes: ["200-299"],
          dns_resolve_type: "A",
          dns_resolve_server: "1.1.1.1",
          expiryNotification: false,
          notificationIDList: {},
          url: "https://",
          method: "GET",
          conditions: "[]", // Empty JSON array as string
        };

        console.log(`📁 Creating group: ${group.name}`);
        socket.emit("add", group, (groupResponse: any) => {
          if (groupResponse.ok) {
            const groupId = groupResponse.monitorID;
            console.log(`✅ Created group: ${group.name} (ID: ${groupId})`);

            // Now create monitors under the group
            let monitorCount = 0;
            APIS.forEach((apiName) => {
              const monitor = {
                name: API_DESCRIPTIONS[apiName as keyof typeof API_DESCRIPTIONS],
                type: "http",
                url: `${API_BASE}/api/health/${apiName}`,
                method: "GET",
                interval: 1800, // 30 minutes
                retryInterval: 300, // 5 minutes
                maxretries: 3,
                timeout: 30,
                active: true,
                ignoreTls: false,
                upsideDown: false,
                maxredirects: 10,
                accepted_statuscodes: ["200-299"],
                dns_resolve_type: "A",
                dns_resolve_server: "1.1.1.1",
                expiryNotification: true,
                notificationIDList: {},
                parent: groupId, // Set parent to the group ID
                conditions: "[]", // Empty JSON array as string
              };

              socket.emit("add", monitor, (response: any) => {
                if (response.ok) {
                  console.log(`✅ Created monitor: ${monitor.name} (ID: ${response.monitorID})`);
                } else {
                  console.error(`❌ Failed to create monitor: ${monitor.name} - ${response.msg}`);
                }

                monitorCount++;
                if (monitorCount === APIS.length) {
                  console.log(
                    `\n✨ Monitor creation completed: 1 group + ${monitorCount} monitors`,
                  );
                  socket.disconnect();
                  resolve();
                }
              });
            });
          } else {
            console.error(`❌ Failed to create group: ${group.name} - ${groupResponse.msg}`);
            socket.disconnect();
            reject(new Error("Failed to create group"));
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

  if (shouldExport) {
    const config = generateUptimeKumaConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }

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
