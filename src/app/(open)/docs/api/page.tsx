import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { DocsSidebar, MobileDocsNav } from "../DocsSidebar";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "atypica.AI API reference for programmatic access",
};

export default async function ApiDocsPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "atypica.musedam.cc";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseURL = `${protocol}://${host}/api`;
  const baseAppURL = `${protocol}://${host}`;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        <MobileDocsNav />

        <div className="md:flex md:gap-8">
          <DocsSidebar />

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Authentication */}
            <section id="authentication" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">Authentication</h2>

              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                  <p className="text-sm text-foreground">
                    <strong>Note:</strong> API access requires a team account. Personal accounts do
                    not support API access.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  All API requests require an API key in the Authorization header.
                </p>

                <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto">
                  <pre className="font-mono text-xs text-foreground whitespace-pre">
                    Authorization: Bearer YOUR_API_KEY
                  </pre>
                </div>

                <p className="text-sm text-muted-foreground">
                  Generate your API key from the{" "}
                  <Link
                    href="/team/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    team management dashboard
                  </Link>
                  .
                </p>
              </div>
            </section>

            {/* Base URL */}
            <section id="base-url" className="mb-16 scroll-mt-8">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border">Base URL</h2>

              <div className="bg-muted/50 border border-border rounded-md p-4 overflow-x-auto">
                <pre className="font-mono text-xs text-foreground whitespace-pre">{baseURL}</pre>
              </div>
            </section>

            {/* List Members */}
            <section id="list-members" className="mb-16 scroll-mt-8">
              <h2 className="text-lg font-bold mb-6 border-b border-border pb-2">List Members</h2>

              <div className="mb-4">
                <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded text-xs font-bold mr-2">
                  GET
                </span>
                <span className="font-mono text-sm text-foreground">/team/members</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">List all team members.</p>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Request
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`curl -X GET ${baseURL}/team/members \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                  </pre>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Response (200 OK)
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`{
  "success": true,
  "data": [
    {
      "id": 42,
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "personalUserId": 123
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Create User */}
            <section id="create-user" className="mb-16 scroll-mt-8">
              <h2 className="text-lg font-bold mb-6 border-b border-border pb-2">Create User</h2>

              <div className="mb-4">
                <span className="inline-block px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs font-bold mr-2">
                  POST
                </span>
                <span className="font-mono text-sm text-foreground">/team/members/create</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Create a new user and add them to the team. The email domain must be verified in
                your team&apos;s domain whitelist.
              </p>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4 mb-4">
                <p className="text-sm text-foreground">
                  <strong>Note:</strong> Users created via API do not receive signup token bonuses.
                </p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Request Body
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`{
  "email": "user@verified-domain.com",
  "password": "optional_password"
}`}
                  </pre>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Request
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`curl -X POST ${baseURL}/team/members/create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@verified-domain.com"}'`}
                  </pre>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Response (200 OK)
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`{
  "success": true,
  "data": {
    "id": 789,
    "email": "user@verified-domain.com",
    "name": "user",
    "personalUserId": 456,
    "teamUserId": 789,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Invite User */}
            <section id="invite-user" className="mb-16 scroll-mt-8">
              <h2 className="text-lg font-bold mb-6 border-b border-border pb-2">Invite User</h2>

              <div className="mb-4">
                <span className="inline-block px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs font-bold mr-2">
                  POST
                </span>
                <span className="font-mono text-sm text-foreground">/team/members/invite</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Invite an existing user to join the team. The user must already have a registered
                account, and their email domain must be verified in your team&apos;s domain
                whitelist.
              </p>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Request Body
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`{
  "email": "existinguser@verified-domain.com"
}`}
                  </pre>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Request
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`curl -X POST ${baseURL}/team/members/invite \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "existinguser@verified-domain.com"}'`}
                  </pre>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Response (200 OK)
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`{
  "success": true,
  "data": {
    "id": 790,
    "personalUserId": 456,
    "teamIdAsMember": 1,
    "name": "User Name",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Generate Impersonation URL */}
            <section id="impersonation" className="mb-16 scroll-mt-8">
              <h2 className="text-lg font-bold mb-6 border-b border-border pb-2">Impersonation</h2>

              <div className="mb-4">
                <span className="inline-block px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs font-bold mr-2">
                  POST
                </span>
                <span className="font-mono text-sm text-foreground">
                  /team/members/:userId/impersonation
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Generate impersonation login URL for a member.
              </p>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Path Parameters
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="font-mono text-xs text-primary pr-4 py-1">userId</td>
                        <td className="text-sm text-muted-foreground pr-4 py-1">number</td>
                        <td className="text-sm text-foreground py-1">Team member user ID</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Request Body (optional)
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`{
  "expiryHours": 24
}`}
                  </pre>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Request
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`curl -X POST ${baseURL}/team/members/42/impersonation \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"expiryHours": 24}'`}
                  </pre>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground uppercase mb-2 font-medium">
                  Response (200 OK)
                </h3>
                <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-xs">
                    {`{
  "success": true,
  "data": {
    "loginUrl": "${baseAppURL}/auth/impersonation-login?token=...",
    "expiryHours": 24,
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Error Responses */}
            <section id="errors" className="mb-16 scroll-mt-8">
              <h2 className="text-lg font-bold mb-6 border-b border-border pb-2">
                Error Responses
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">401 Unauthorized</h3>
                  <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`{
  "success": false,
  "error": "Unauthorized: API Key is required"
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">404 Not Found</h3>
                  <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`{
  "success": false,
  "error": "Member not found in this team"
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    500 Internal Server Error
                  </h3>
                  <div className="bg-muted/50 border border-border rounded p-4 overflow-x-auto">
                    <pre className="font-mono text-xs">
                      {`{
  "success": false,
  "error": "Internal server error"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Rate Limits */}
            <section id="rate-limits" className="mb-16 scroll-mt-8">
              <h2 className="text-lg font-bold mb-6 border-b border-border pb-2">Rate Limits</h2>

              <p className="text-sm text-muted-foreground mb-4">
                API requests are currently not rate-limited, but please use responsibly.
              </p>

              <p className="text-sm text-muted-foreground">
                Rate limiting may be enforced in the future. We recommend implementing exponential
                backoff in your client.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
