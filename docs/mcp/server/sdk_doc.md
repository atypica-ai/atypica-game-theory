# Build an MCP server

> Get started building your own server to use in Claude for Desktop and other clients.

In this tutorial, we'll build a simple MCP weather server and connect it to a host, Claude for Desktop.

### What we'll be building

We'll build a server that exposes two tools: `get_alerts` and `get_forecast`. Then we'll connect the server to an MCP host (in this case, Claude for Desktop):

<Note>
  Servers can connect to any client. We've chosen Claude for Desktop here for simplicity, but we also have guides on [building your own client](/docs/develop/build-client) as well as a [list of other clients here](/clients).
</Note>

### Core MCP Concepts

MCP servers can provide three main types of capabilities:

1. **[Resources](/docs/learn/server-concepts#resources)**: File-like data that can be read by clients (like API responses or file contents)
2. **[Tools](/docs/learn/server-concepts#tools)**: Functions that can be called by the LLM (with user approval)
3. **[Prompts](/docs/learn/server-concepts#prompts)**: Pre-written templates that help users accomplish specific tasks

This tutorial will primarily focus on tools.
Let's get started with building our weather server! [You can find the complete code for what we'll be building here.](https://github.com/modelcontextprotocol/quickstart-resources/tree/main/weather-server-typescript)

### Prerequisite knowledge

This quickstart assumes you have familiarity with:

* TypeScript
* LLMs like Claude

### Logging in MCP Servers

When implementing MCP servers, be careful about how you handle logging:

**For STDIO-based servers:** Never write to standard output (stdout). This includes:

* `print()` statements in Python
* `console.log()` in JavaScript
* `fmt.Println()` in Go
* Similar stdout functions in other languages

Writing to stdout will corrupt the JSON-RPC messages and break your server.

**For HTTP-based servers:** Standard output logging is fine since it doesn't interfere with HTTP responses.

### Best Practices

1. Use a logging library that writes to stderr or files, such as `logging` in Python.
2. For JavaScript, be especially careful - `console.log()` writes to stdout by default

### Quick Examples

```javascript  theme={null}
// ❌ Bad (STDIO)
console.log("Server started");

// ✅ Good (STDIO)
console.error("Server started"); // stderr is safe
```

### System requirements

For TypeScript, make sure you have the latest version of Node installed.

### Set up your environment

First, let's install Node.js and npm if you haven't already. You can download them from [nodejs.org](https://nodejs.org/).
Verify your Node.js installation:

```bash  theme={null}
node --version
npm --version
```

For this tutorial, you'll need Node.js version 16 or higher.

Now, let's create and set up our project:

<CodeGroup>
    ```bash macOS/Linux theme={null}
    # Create a new directory for our project
    mkdir weather
    cd weather

    # Initialize a new npm project
    npm init -y

    # Install dependencies
    npm install @modelcontextprotocol/sdk zod@3
    npm install -D @types/node typescript

    # Create our files
    mkdir src
    touch src/index.ts
    ```

    ```powershell Windows theme={null}
    # Create a new directory for our project
    md weather
    cd weather

    # Initialize a new npm project
    npm init -y

    # Install dependencies
    npm install @modelcontextprotocol/sdk zod@3
    npm install -D @types/node typescript

    # Create our files
    md src
    new-item src\index.ts
    ```
</CodeGroup>

Update your package.json to add type: "module" and a build script:

```json package.json theme={null}
{
    "type": "module",
    "bin": {
    "weather": "./build/index.js"
    },
    "scripts": {
    "build": "tsc && chmod 755 build/index.js"
    },
    "files": ["build"]
}
```

Create a `tsconfig.json` in the root of your project:

```json tsconfig.json theme={null}
{
    "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules"]
}
```

Now let's dive into building your server.

## Building your server

### Importing packages and setting up the instance

Add these to the top of your `src/index.ts`:

```typescript  theme={null}
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
    name: "weather",
    version: "1.0.0",
    capabilities: {
    resources: {},
    tools: {},
    },
});
```

### Helper functions

Next, let's add our helper functions for querying and formatting the data from the National Weather Service API:

```typescript  theme={null}
// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
    const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
    };

    try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
    } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
    }
}

interface AlertFeature {
    properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
    };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
    const props = feature.properties;
    return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
    ].join("\n");
}

interface ForecastPeriod {
    name?: string;
    temperature?: number;
    temperatureUnit?: string;
    windSpeed?: string;
    windDirection?: string;
    shortForecast?: string;
}

interface AlertsResponse {
    features: AlertFeature[];
}

interface PointsResponse {
    properties: {
    forecast?: string;
    };
}

interface ForecastResponse {
    properties: {
    periods: ForecastPeriod[];
    };
}
```

### Implementing tool execution

The tool execution handler is responsible for actually executing the logic of each tool. Let's add it:

```typescript  theme={null}
// Register weather tools
server.tool(
    "get_alerts",
    "Get weather alerts for a state",
    {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
    },
    async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
        return {
        content: [
            {
            type: "text",
            text: "Failed to retrieve alerts data",
            },
        ],
        };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
        return {
        content: [
            {
            type: "text",
            text: `No active alerts for ${stateCode}`,
            },
        ],
        };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

    return {
        content: [
        {
            type: "text",
            text: alertsText,
        },
        ],
    };
    },
);

server.tool(
    "get_forecast",
    "Get weather forecast for a location",
    {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude of the location"),
    },
    async ({ latitude, longitude }) => {
    // Get grid point data
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData) {
        return {
        content: [
            {
            type: "text",
            text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
            },
        ],
        };
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
        return {
        content: [
            {
            type: "text",
            text: "Failed to get forecast URL from grid point data",
            },
        ],
        };
    }

    // Get forecast data
    const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
    if (!forecastData) {
        return {
        content: [
            {
            type: "text",
            text: "Failed to retrieve forecast data",
            },
        ],
        };
    }

    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
        return {
        content: [
            {
            type: "text",
            text: "No forecast periods available",
            },
        ],
        };
    }

    // Format forecast periods
    const formattedForecast = periods.map((period: ForecastPeriod) =>
        [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
        ].join("\n"),
    );

    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

    return {
        content: [
        {
            type: "text",
            text: forecastText,
        },
        ],
    };
    },
);
```
