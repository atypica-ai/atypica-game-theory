import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { DocsSidebar, MobileDocsNav } from "../DocsSidebar";

export const metadata: Metadata = {
  title: "Embed Integration Documentation",
  description: "Learn how to embed atypica.AI into your application using iframe and postMessage",
};

export default async function EmbedDocsPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "atypica.musedam.cc";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseAppURL = `${protocol}://${host}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        <MobileDocsNav />

        <div className="md:flex md:gap-8">
          <DocsSidebar />

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Quick Start */}
            <section id="quick-start" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">Quick Start</h2>

              <p className="text-sm text-muted-foreground mb-6">
                Embed atypica.AI into your application and communicate with it using the postMessage
                API for bidirectional communication.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-3">1. Embed the iframe</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use the impersonation login URL to automatically authenticate users. You can obtain
                    the login URL from the{" "}
                    <Link href="/docs/api#impersonation" className="text-primary hover:underline">
                      Impersonation API endpoint
                    </Link>
                    .
                  </p>
                  <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`<iframe
  id="atypica-iframe"
  src="${baseAppURL}/auth/impersonation-login?token=YOUR_TOKEN"
  width="100%"
  height="800px"
  frameborder="0"
></iframe>`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">2. Listen for messages</h3>
                  <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`window.addEventListener("message", function (event) {
  if (event.data.source !== "atypica") {
    return; // Ignore non-atypica messages
  }

  console.log("Received message:", event.data);
  // Handle message...
});`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">3. Send messages</h3>
                  <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`const iframe = document.getElementById("atypica-iframe");
iframe.contentWindow.postMessage(
  {
    target: "atypica",
    type: "check_auth",
    timestamp: new Date().toISOString(),
  },
  "*"
);`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Message Protocol */}
            <section id="message-protocol" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                Message Protocol
              </h2>

              <p className="text-sm text-muted-foreground mb-4">
                All messages use JSON format with the following base fields:
              </p>

              <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-semibold">Field</th>
                      <th className="text-left py-2 px-2 font-semibold">Type</th>
                      <th className="text-left py-2 px-2 font-semibold">Required</th>
                      <th className="text-left py-2 px-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono text-xs">source</td>
                      <td className="py-2 px-2 text-muted-foreground">string</td>
                      <td className="py-2 px-2 text-muted-foreground">Yes (responses)</td>
                      <td className="py-2 px-2">Fixed value &quot;atypica&quot;</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono text-xs">target</td>
                      <td className="py-2 px-2 text-muted-foreground">string</td>
                      <td className="py-2 px-2 text-muted-foreground">Yes (requests)</td>
                      <td className="py-2 px-2">Fixed value &quot;atypica&quot;</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono text-xs">type</td>
                      <td className="py-2 px-2 text-muted-foreground">string</td>
                      <td className="py-2 px-2 text-muted-foreground">Yes</td>
                      <td className="py-2 px-2">Message type</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-mono text-xs">timestamp</td>
                      <td className="py-2 px-2 text-muted-foreground">string</td>
                      <td className="py-2 px-2 text-muted-foreground">Yes</td>
                      <td className="py-2 px-2">ISO 8601 timestamp</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                Authentication
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-3">Check Authentication Status</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Request authentication status from the embedded iframe:
                  </p>

                  <div className="mb-4">
                    <h4 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                      Request
                    </h4>
                    <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                      <pre className="font-mono text-xs">
                        {`{
  "target": "atypica",
  "type": "check_auth",
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                      Response
                    </h4>
                    <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                      <pre className="font-mono text-xs">
                        {`{
  "source": "atypica",
  "type": "auth_status",
  "authenticated": true,
  "user": {
    "email": "user@example.com"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">URL Change Notifications</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    The iframe automatically sends notifications when the URL changes:
                  </p>

                  <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`{
  "source": "atypica",
  "type": "href",
  "href": "${baseAppURL}/study/xxx",
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Actions */}
            <section id="actions" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">Actions</h2>

              <div className="space-y-8">
                {/* Create Study */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Create Study Chat</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a new research conversation and navigate to it:
                  </p>

                  <div className="mb-4">
                    <h4 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                      Request
                    </h4>
                    <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                      <pre className="font-mono text-xs">
                        {`{
  "target": "atypica",
  "type": "action",
  "action": "createStudyUserChat",
  "args": {
    "content": "Analyze Apple's latest financial report"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                      Response
                    </h4>
                    <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                      <pre className="font-mono text-xs">
                        {`{
  "source": "atypica",
  "type": "action_result",
  "action": "createStudyUserChat",
  "result": {
    "token": "study-chat-token-123",
    "id": "chat-id-456"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Fetch Reports */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Fetch Analyst Reports</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Retrieve analyst reports from the current study chat (only works on{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">/study/[token]</code>{" "}
                    pages):
                  </p>

                  <div className="mb-4">
                    <h4 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                      Request
                    </h4>
                    <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                      <pre className="font-mono text-xs">
                        {`{
  "target": "atypica",
  "type": "action",
  "action": "fetchAnalystReportsOfStudyUserChat",
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                      Response
                    </h4>
                    <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                      <pre className="font-mono text-xs">
                        {`{
  "source": "atypica",
  "type": "action_result",
  "action": "fetchAnalystReportsOfStudyUserChat",
  "result": [
    {
      "token": "report-token-1",
      "onePageHtml": "<html>...</html>"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Error Response */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Error Responses</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    When an action fails, you&apos;ll receive an error response:
                  </p>

                  <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`{
  "source": "atypica",
  "type": "action_error",
  "action": "createStudyUserChat",
  "error": "Content cannot be empty",
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Complete Example */}
            <section id="complete-example" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                Complete Example
              </h2>

              <p className="text-sm text-muted-foreground mb-4">
                A complete workflow example demonstrating auto-login, creating a study, and fetching
                reports:
              </p>

              <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto">
                <pre className="font-mono text-xs">
                  {`<!DOCTYPE html>
<html>
  <head>
    <title>atypica.AI Embed Example</title>
  </head>
  <body>
    <iframe
      id="atypica-iframe"
      src="${baseAppURL}/auth/impersonation-login?token=YOUR_TOKEN"
      width="100%"
      height="800px"
    ></iframe>

    <div id="results"></div>

    <script>
      const iframe = document.getElementById("atypica-iframe");
      let currentUrl = "";

      // Listen for messages
      window.addEventListener("message", function (event) {
        if (event.data.source !== "atypica") return;

        console.log("Received:", event.data);

        // Track URL changes
        if (event.data.type === "href") {
          currentUrl = event.data.href;

          // Auto-create study when on home page
          if (currentUrl.includes("musedam.cc/") &&
              !currentUrl.includes("/study/")) {
            createStudy();
          }

          // Fetch reports when on study page
          if (currentUrl.includes("/study/")) {
            setTimeout(fetchReports, 2000);
          }
        }

        // Handle action results
        if (event.data.type === "action_result") {
          if (event.data.action === "fetchAnalystReportsOfStudyUserChat") {
            displayReports(event.data.result);
          }
        }
      });

      function createStudy() {
        iframe.contentWindow.postMessage({
          target: "atypica",
          type: "action",
          action: "createStudyUserChat",
          args: {
            content: "Analyze Apple's latest earnings"
          },
          timestamp: new Date().toISOString()
        }, "*");
      }

      function fetchReports() {
        iframe.contentWindow.postMessage({
          target: "atypica",
          type: "action",
          action: "fetchAnalystReportsOfStudyUserChat",
          timestamp: new Date().toISOString()
        }, "*");
      }

      function displayReports(reports) {
        const results = document.getElementById("results");
        results.innerHTML = \`Found \${reports.length} reports\`;
      }
    </script>
  </body>
</html>`}
                </pre>
              </div>
            </section>

            {/* Security */}
            <section id="security" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">Security</h2>

              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Important Security Considerations
                  </h3>
                  <ul className="text-sm text-foreground space-y-2 list-disc list-inside">
                    <li>Always validate the message source domain</li>
                    <li>Filter out non-atypica messages</li>
                    <li>Use HTTPS in production environments</li>
                    <li>Keep impersonation tokens secure</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">Domain Verification Example</h3>
                  <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`window.addEventListener("message", function (event) {
  // Verify origin domain
  if (event.origin !== "https://your-trusted-domain.com") {
    return;
  }

  // Verify message format
  if (event.data.source !== "atypica") {
    return;
  }

  // Process message...
});`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                Troubleshooting
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-2">iframe fails to load</h3>
                  <p className="text-sm text-muted-foreground">
                    Verify the URL is correct and that the target page allows iframe embedding
                    (check X-Frame-Options headers).
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-2">No response to messages</h3>
                  <p className="text-sm text-muted-foreground">
                    Ensure the iframe is fully loaded before sending messages. Use a delay or
                    listen for the load event.
                  </p>
                  <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto mt-2">
                    <pre className="font-mono text-xs">
                      {`iframe.addEventListener("load", function() {
  // iframe is ready, now send messages
  sendMessage();
});`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-2">Cross-origin issues</h3>
                  <p className="text-sm text-muted-foreground">
                    Always use the postMessage API for cross-origin communication. Do not attempt
                    to directly access iframe content.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-2">Action not working on wrong page</h3>
                  <p className="text-sm text-muted-foreground">
                    Some actions only work on specific routes. For example,{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      fetchAnalystReportsOfStudyUserChat
                    </code>{" "}
                    only works on <code className="bg-muted px-1 py-0.5 rounded text-xs">/study/[token]</code>{" "}
                    pages. Check the URL using the <code className="bg-muted px-1 py-0.5 rounded text-xs">href</code>{" "}
                    message type.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
