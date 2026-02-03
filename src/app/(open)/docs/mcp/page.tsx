import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { DocsSidebar, MobileDocsNav } from "../DocsSidebar";

export const metadata: Metadata = {
  title: "MCP & Skills Documentation",
  description:
    "Learn how to integrate atypica.AI research capabilities through MCP protocol and Agent Skills",
};

export default async function McpDocsPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "atypica.ai";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseURL = `${protocol}://${host}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        <MobileDocsNav />

        <div className="md:flex md:gap-8">
          <DocsSidebar />

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Overview */}
            <section id="overview" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">Overview</h2>

              <p className="text-sm text-muted-foreground mb-6">
                atypica.AI provides two integration methods: <strong>MCP Server</strong> for
                programmatic access and <strong>Agent Skills</strong> for direct use in
                MCP-compatible AI assistants.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-2">Study MCP Server</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Model Context Protocol server providing 9 core research tools. Connect it to any
                    MCP-compatible client to access atypica&apos;s research capabilities
                    programmatically.
                  </p>
                  <a href="#mcp-server" className="text-sm text-primary hover:underline">
                    Learn more &rarr;
                  </a>
                </div>

                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-2">atypica-research Skill</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pre-built agent skill ready to use with MCP-compatible AI assistants. Install
                    it once and start conducting research through natural conversations.
                  </p>
                  <a href="#agent-skill" className="text-sm text-primary hover:underline">
                    Learn more &rarr;
                  </a>
                </div>
              </div>
            </section>

            {/* MCP Server */}
            <section id="mcp-server" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                Study MCP Server
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-3">Server Endpoint</h3>
                  <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto mb-3">
                    <pre className="font-mono text-xs text-foreground whitespace-pre">
                      {baseURL}/mcp/study
                    </pre>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Authentication:</strong> Bearer token with your API key (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">atypica_xxx</code>)
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">Available Tools</h3>
                  <div className="bg-muted/50 border border-border rounded-md p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-semibold">Tool</th>
                          <th className="text-left py-2 px-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_study_
                            <br />
                            create
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            Create a new research session
                          </td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_study_
                            <br />
                            send_message
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            Send message and execute AI synchronously (10-120s)
                          </td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_study_
                            <br />
                            get_messages
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            Retrieve conversation history and execution status
                          </td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_study_
                            <br />
                            list
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            List historical research sessions with replay URLs
                          </td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_study_
                            <br />
                            get_report
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            Get research report (HTML) with share URL
                          </td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_study_
                            <br />
                            get_podcast
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            Get podcast content and audio with share URL
                          </td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_persona_
                            <br />
                            search
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            Semantic search for AI personas
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-mono text-xs">
                            atypica_persona_
                            <br />
                            get
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            Get detailed persona information
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">Quick Start</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    1. Get your API key from{" "}
                    <Link
                      href="/account/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      account settings
                    </Link>
                  </p>

                  <p className="text-sm text-muted-foreground mb-3">
                    2. Connect to the MCP server with authentication:
                  </p>
                  <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto mb-3">
                    <pre className="font-mono text-xs">
                      {`curl -X POST ${baseURL}/mcp/study \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "atypica_study_create",
      "arguments": {
        "content": "Research young people's coffee preferences"
      }
    },
    "id": 1
  }'`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">Research Workflow</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      <strong>Create</strong> research session with initial query
                    </li>
                    <li>
                      <strong>Send</strong> messages to drive research forward (AI executes
                      synchronously)
                    </li>
                    <li>
                      <strong>Poll</strong> for pending interactions that require user input
                    </li>
                    <li>
                      <strong>Handle</strong> interactions by submitting tool results
                    </li>
                    <li>
                      <strong>Monitor</strong> progress and retrieve artifacts (reports/podcasts)
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Agent Skill */}
            <section id="agent-skill" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                atypica-research Skill
              </h2>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    The <code className="bg-muted px-1 py-0.5 rounded text-xs">atypica-research</code> skill is a pre-configured
                    agent skill that makes it easy to use atypica&apos;s research capabilities
                    with MCP-compatible AI assistants.
                  </p>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4 mb-4">
                    <p className="text-sm text-foreground">
                      <strong>Download Skills:</strong> Visit{" "}
                      <a
                        href="https://skill0.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        skill0.io
                      </a>{" "}
                      to download the atypica-research skill and other community agent skills.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">Installation Steps</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                    <li>
                      <strong>Get API Key:</strong> Visit{" "}
                      <Link
                        href="/account/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {baseURL}/account/settings
                      </Link>{" "}
                      to create an API key (format: <code className="bg-muted px-1 py-0.5 rounded text-xs">atypica_xxx</code>)
                    </li>
                    <li>
                      <strong>Install MCP Server:</strong> Add the server to your AI assistant&apos;s MCP configuration
                      <div className="bg-muted/50 border border-border rounded-md p-3 mt-2 overflow-x-auto">
                        <pre className="font-mono text-xs">
                          {`# Example command (syntax varies by tool)
mcp add --transport http atypica-research ${baseURL}/mcp/study \\
  --header "Authorization: Bearer YOUR_API_KEY_HERE"`}
                        </pre>
                      </div>
                    </li>
                    <li>
                      <strong>Download Skill:</strong> Get the{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">atypica-research</code> skill from{" "}
                      <a
                        href="https://skill0.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        skill0.io
                      </a>
                    </li>
                    <li>
                      <strong>Restart:</strong> Restart your AI assistant to load the new skill
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">Usage Example</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Once installed, simply chat with your AI assistant naturally. The skill handles the MCP
                    protocol communication:
                  </p>
                  <div className="bg-muted/50 border border-border rounded-md p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">User:</p>
                        <p className="text-sm text-muted-foreground">
                          &quot;Research young people&apos;s coffee preferences and create a
                          report&quot;
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">AI Assistant:</p>
                        <p className="text-sm text-muted-foreground">
                          &quot;I&apos;ll create a research study for you. This will involve
                          analyzing consumer data, conducting virtual interviews, and generating a
                          comprehensive report... [proceeds to use atypica tools]&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">What the Skill Does</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Creates research sessions automatically</li>
                    <li>Manages research workflow and AI execution</li>
                    <li>Handles user interactions when confirmation is needed</li>
                    <li>Retrieves and presents reports and podcasts with shareable URLs</li>
                    <li>Provides AI persona search and selection</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Research Types */}
            <section id="research-types" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                Research Types
              </h2>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  atypica supports multiple research types, each optimized for different business
                  questions:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Product Testing</h4>
                    <p className="text-sm text-muted-foreground">
                      A/B testing, user preference comparisons, and feature validation
                    </p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Market Insights</h4>
                    <p className="text-sm text-muted-foreground">
                      Consumer behavior analysis, sentiment research, and trend identification
                    </p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Content Creation</h4>
                    <p className="text-sm text-muted-foreground">
                      Creative ideation, content strategy, and messaging development
                    </p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Strategic Planning</h4>
                    <p className="text-sm text-muted-foreground">
                      Market entry strategies, product roadmaps, and business planning
                    </p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Product R&amp;D</h4>
                    <p className="text-sm text-muted-foreground">
                      Innovation discovery, social trend analysis, and product opportunity
                      identification
                    </p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Fast Insight</h4>
                    <p className="text-sm text-muted-foreground">
                      Quick research with podcast generation for easy consumption
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* API Reference */}
            <section id="api-reference" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                API Reference
              </h2>

              <p className="text-sm text-muted-foreground mb-4">
                For complete API documentation including detailed schemas, error handling, and
                workflow examples, see the skill&apos;s built-in reference:
              </p>

              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Detailed input/output schemas for all 9 tools</li>
                <li>Complete workflow examples (basic research, user interactions, etc.)</li>
                <li>Error codes and troubleshooting guide</li>
                <li>Security considerations and limitations</li>
                <li>Performance optimization best practices</li>
              </ul>

              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                <p className="text-sm text-foreground">
                  <strong>Full API documentation</strong> is included in the skill download from{" "}
                  <a
                    href="https://skill0.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    skill0.io
                  </a>
                  . The skill package contains comprehensive guides and reference materials.
                </p>
              </div>
            </section>

            {/* Support */}
            <section id="support" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">
                Support &amp; Community
              </h2>

              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong>API Keys:</strong> Manage your API keys in{" "}
                  <Link
                    href="/account/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    account settings
                  </Link>
                </p>

                <p>
                  <strong>Skill Downloads:</strong> Get the latest skills from{" "}
                  <a
                    href="https://skill0.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    skill0.io
                  </a>
                </p>

                <p>
                  <strong>Questions?</strong> Contact us through{" "}
                  <Link href="/about" className="text-primary hover:underline">
                    our support channels
                  </Link>
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
