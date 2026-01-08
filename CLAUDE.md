# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

atypica.AI is a business research AI agent framework that uses multi-agent collaboration to understand subjective business factors like consumer emotions, market perceptions, and decision preferences. The system models consumer personalities through AI agents and captures behavior through interactions.

## Development Commands

### Essential Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests with Vitest
- `pnpm lint` - Run ESLint with zero warnings tolerance
- `pnpm lint:fix` - Auto-fix ESLint errors
- `pnpm format` - Format code with Prettier

### Admin and Utility Scripts

- `pnpm admintool` - Run admin management tools (`tsx scripts/admintool.ts`)
- `pnpm analytics` - Generate analytics reports (`tsx scripts/analytics-report.ts`)

### Database Operations

- `npx prisma generate` - Generate Prisma client and types
- `npx prisma migrate dev` - Run database migrations in development
- `npx prisma migrate deploy` - Deploy migrations to production

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19
- **Database**: PostgreSQL 15 with pgvector extension for embeddings
- **AI Models**: Multiple providers supported (Claude, GPT-4, Google, Azure, etc.)
- **ORM**: Prisma with Accelerate and Read Replicas extensions
- **Auth**: NextAuth.js
- **UI**: Radix UI components with Tailwind CSS v4
- **Internationalization**: next-intl
- **Testing**: Vitest with jsdom

### Core Multi-Agent System

The system采用统一 Agent 架构，支持多种研究类型和持久化记忆：

**统一执行架构** (`src/app/(study)/agents/`):
- **baseAgentRequest.ts** - 统一的 Agent 执行器（删除 1,211 行重复代码）
- **configs/** - 各类 Agent 配置（planModeAgentConfig, studyAgentConfig, fastInsightAgentConfig, productRnDAgentConfig）

**核心 Agent 类型**:
1. **Plan Mode Agent** - 意图澄清层：自动判断研究类型，展示完整计划，一键确认开始
2. **Study Agent** - 综合研究：testing/insights/creation/planning/misc 五种研究类型
3. **Fast Insight Agent** - 快速洞察：专注播客内容生成的自动化工作流
4. **Product R&D Agent** - 产品研发：市场趋势、用户需求、创意生成
5. **Scout Agent** (`src/app/(newStudy)/`) - 社交媒体观察，通过定性分析理解用户群体
6. **Interviewer Agent** (`src/app/(interviewProject)/`) - 专业访谈系统
7. **Persona Agent** (`src/app/(persona)/`) - 用户画像模拟和反馈

**Memory System** (`src/app/(memory)/`):
- 用户和团队级的持久化记忆
- 双层架构：核心记忆（core）+ 工作记忆（working）
- 自动提取、重组和压缩
- AI 无需重复询问，理解越来越深入

**架构特点**:
- 消息驱动：所有研究内容通过消息流转，统一灵活
- 推理-执行分离：Plan Mode 决策"做什么"，执行 Agent 规划"怎么做"
- 功能统一：所有 Agent 支持参考研究、文件附件、MCP 集成、团队提示词

### Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (study)/           # Main research assistant functionality
│   ├── (agents)/          # Multi-agent answer system
│   ├── (persona)/         # User persona library and chat
│   ├── (interviewProject)/# Interview simulation system
│   ├── (newStudy)/        # User discovery and scouting
│   ├── (auth)/            # Authentication system
│   ├── (public)/          # Public marketing pages
│   ├── account/           # User account management
│   ├── admin/             # Admin dashboard
│   ├── analyst/           # Research analyst tools
│   ├── api/               # API routes
│   └── payment/           # Payment and subscription system
├── ai/                    # AI service layer
│   ├── prompt/            # AI prompt templates
│   ├── tools/             # AI tool definitions and implementations
│   ├── provider.ts        # Multi-provider AI client configuration
│   └── messageUtils.ts    # Message processing utilities
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── i18n/                  # Internationalization setup
├── lib/                   # Utility functions and configurations
├── prisma/                # Database client and utilities
└── types/                 # TypeScript type definitions
```

### Key AI Tools

The system provides specialized AI tools in two main locations:

**Study Tools** (`src/app/(study)/tools/`):
- **makeStudyPlan** - Plan Mode:展示完整研究计划，一键确认开始
- **saveAnalyst** - 统一的研究意图保存（支持 7 种 kind）
- **planStudy/planPodcast** - 研究和播客的战术规划
- **interviewChat** - 一对一深度访谈（5-10人）
- **discussionChat** - 群体讨论模式（3-8人，观点碰撞）
- **scoutTaskChat** - 社交媒体观察和人设构建（3阶段：观察 → 推理 → 验证）
- **generateReport/generatePodcast** - 研究报告和播客生成
- **buildPersona/searchPersonas** - AI 人设构建和搜索
- **requestInteraction** - 通用用户交互工具

**通用工具** (`src/ai/tools/`):
- **reasoningThinking** - 深度分析和推理（Scout 在 5 次观察后触发）
- **webSearch/webFetch** - 网络搜索和内容提取
- **experts/** - 专家系统（报告生成、播客制作等）
- **social/** - 社交媒体数据源集成
- **mcp/** - MCP 协议集成，支持团队自定义工具

### Database Schema

Core entities include:

- **User/Team** - User management with team support
- **Memory** - 持久化记忆系统（用户级和团队级）
  - `core`: Markdown 格式的核心记忆
  - `working`: JSON 格式的工作记忆
  - `version`: 版本管理，支持重组历史追溯
  - 支持智能重组：超过阈值自动压缩和去重
- **Persona** - AI personas with vector embeddings for similarity search
- **UserChat** - Conversation sessions with different kinds (scout, study, interview, etc.)
- **Analyst** - Research analysts conducting studies
  - `kind`: 研究类型（productRnD, fastInsight, testing, insights, creation, planning, misc）
  - `studyLog`: 从消息自动生成的研究日志
- **InterviewProject/Session** - Interview simulation system
- **TokensAccount** - Usage tracking and billing
- **Subscription/PaymentRecord** - Subscription and payment management

### Environment Setup

Required environment variables:

- `DATABASE_URL` and `SHADOW_DATABASE_URL` for PostgreSQL
- `AUTH_SECRET` for NextAuth.js (generate with `npx auth secret`)
- AI provider API keys for various LLM services
- Payment provider credentials (Stripe, Ping++)
- Optional: Uptime Kuma monitoring integration

### Testing Strategy

- Uses Vitest with jsdom environment
- Next-intl inline dependency configuration for testing
- Test files should follow standard patterns

### Development Notes

- The codebase uses pnpm with specific build dependencies optimization
- PostgreSQL must have pgvector extension installed for persona embeddings
- Uses Prisma's preview features for PostgreSQL extensions
- Supports both personal users and team-based usage
- Implements comprehensive token usage tracking and subscription management
- Admin tools available for user management and system monitoring

### Health Monitoring

Built-in health check system available at `/api/health` with:

- Database connectivity checks
- LLM model availability testing
- System status monitoring
- Optional Uptime Kuma integration

Run health checks with: `npx tsx scripts/check-status.ts`

## Code Conventions

### Git Commit Conventions

**Important**: Only add attribution (co-author, ad) when ALL changes in the commit were written by Claude. If the commit includes user-authored code, use plain commit message without any attribution.

Examples:

- ✅ "fix: resolve authentication bug" (user's changes)
- ✅ "refactor: optimize database queries" (Claude's changes, but no ad per user preference)
- ❌ Never add: "🤖 Generated with Claude Code" or "Co-Authored-By: Claude" unless explicitly requested

### Styling Conventions

#### Tailwind CSS Setup

- **Version**: Tailwind CSS v4 with PostCSS
- **Utility Function**: Use `cn()` from `src/lib/utils.ts` for combining class names

  ```typescript
  import { cn } from "@/lib/utils";

  <div className={cn("base-class", condition && "conditional-class")} />
  ```

#### Theme Configuration

- **Color System**: Uses `oklch` color space for better color management
- **CSS Variables**: Theme tokens defined in `src/app/globals.css` using `@theme` block
- **Dark Mode**: Built-in dark mode support with separate color palettes
- **Custom Variants**: Support for language-specific styles (e.g., `:lang(zh)`)

#### Design Tokens

```css
/* Available theme tokens */
--color-background
--color-foreground
--color-primary
--color-secondary
--color-accent
--color-muted
--color-destructive
--radius-sm, --radius-md, --radius-lg
```

#### Best Practices

1. **Class Name Composition**: Always use `cn()` utility for dynamic classes

   ```typescript
   <Button className={cn("w-full", isLoading && "opacity-50")} />
   ```

2. **Responsive Design**: Use Tailwind's responsive prefixes (sm:, md:, lg:, xl:)

   ```typescript
   <div className="flex flex-col md:flex-row lg:gap-4" />
   ```

3. **Theme-Aware Styling**: Leverage CSS variables for colors

   ```typescript
   <div className="bg-background text-foreground border-border" />
   ```

4. **Component Styling**: Use `class-variance-authority` for component variants

   ```typescript
   import { cva } from "class-variance-authority";

   const buttonVariants = cva("base-classes", {
     variants: {
       variant: {
         default: "bg-primary text-primary-foreground",
         secondary: "bg-secondary text-secondary-foreground",
       },
       size: {
         sm: "h-9 px-3",
         lg: "h-11 px-8",
       },
     },
   });
   ```

5. **Custom Fonts**: Project uses custom fonts (EuclidCircularA, IBMPlexMono) defined in globals.css

### TypeScript Type Safety Conventions

**CRITICAL RULES** - These rules are NEVER negotiable:

#### 1. No `any` Types Allowed

```typescript
// ❌ WRONG: Using any type
const result: any = tool.output;
const token = result.reportToken; // No type safety

// ❌ WRONG: Using eslint-disable to bypass type errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const output = generateReportTool.output as any;

// ✅ CORRECT: Use proper types from AI SDK
const generateReportTool = step.toolResults.find(
  (tool) =>
    !tool.dynamic && tool.type === "tool-result" && tool.toolName === ToolName.generateReport,
) as StaticToolResult<Pick<StudyToolSet, ToolName.generateReport>> | undefined;

if (generateReportTool && "output" in generateReportTool && generateReportTool.output) {
  const reportToken = generateReportTool.output.reportToken; // Fully type-safe!
}
```

**Rule**: "没有任何 any 是合理的" - No any types are acceptable under any circumstances.

#### 2. No Dynamic Imports with `await import()`

```typescript
// ❌ WRONG: Dynamic imports
const { buildReferenceStudyContext } = await import("./referenceContext");
const { shouldDecidePersonaTier } = await import("./utils");

// ✅ CORRECT: Static imports at file top
import { buildReferenceStudyContext } from "./referenceContext";
import { shouldDecidePersonaTier } from "./utils";
```

**Rule**: "await import 不允许在任何地方出现" - Dynamic imports with `await import()` are not allowed anywhere in the codebase.

#### 3. No ESLint Disables to Bypass Type Errors

```typescript
// ❌ WRONG: Hiding type problems with eslint-disable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = someValue;

// ✅ CORRECT: Find and use the correct types
import { StaticToolResult } from "ai";
const data = someValue as StaticToolResult<PickedToolType>;
```

**Rule**: "别 build 出问题就用 any 和 eslint disable" - Don't use `any` or eslint-disable when build fails. Instead, find the correct types from:

- AI SDK type definitions (`StaticToolResult`, `PrepareStepFunction`, etc.)
- Existing similar code patterns
- Ask for clarification when genuinely unsure

#### 4. Study Existing Patterns Before Implementing

When working with complex types (especially AI SDK types):

1. **Search for similar code**: Use grep/search to find how similar problems are solved
2. **Read AI SDK types**: Import and explore types from `ai` package
3. **Look at existing implementations**: Check how other agent configs handle tool results
4. **Ask when uncertain**: It's better to ask than to implement incorrectly with `any`

**Example**: Before handling tool results, search for existing `StaticToolResult` usage:

```bash
# Search for existing patterns
grep -r "StaticToolResult" src/
grep -r "tool.toolName ===" src/app/(study)/agents/
```

#### When You're Blocked by Type Errors

**DO**:

- Read the TypeScript error message carefully
- Search for the type in AI SDK documentation or source
- Look for similar code in the codebase
- Use type guards (`if ("property" in object)`)
- Ask the user for guidance

**DON'T**:

- Add `as any` to bypass the error
- Use `// @ts-ignore` or `eslint-disable`
- Make up types that "seem right"
- Use dynamic imports to defer type checking

### Server Actions Conventions

#### File Structure

- **Location**: Define server actions in `actions.ts` files within feature directories
- **Naming**: Use descriptive function names (e.g., `signUp`, `createPersona`, `deleteSession`)
- **Directive**: Always add `"use server"` at the top of the file

```typescript
"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/client";

export async function createItem(data: CreateItemInput) {
  // Implementation
}
```

#### Return Type Pattern

- **Standard Type**: Use `ServerActionResult<T>` from `@/lib/serverAction`
- **Success Response**:
  ```typescript
  return {
    success: true,
    data: { id: 1, name: "Item" },
    pagination?: { page: 1, pageSize: 10, totalCount: 100, totalPages: 10 }
  };
  ```
- **Error Response**:
  ```typescript
  return {
    success: false,
    message: "Error description",
    code: "not_found" | "unauthorized" | "forbidden" | "internal_server_error",
  };
  ```

#### Authorization Pattern

```typescript
import { withAuth } from "@/lib/request/withAuth";

export const updateProfile = withAuth(async ({ session, user }, profileData: ProfileData) => {
  // session and user are automatically available
  // Redirect to login if unauthorized
});
```

#### Error Handling

```typescript
try {
  const result = await prisma.item.create({ data });
  return { success: true, data: result };
} catch (error) {
  console.error("Failed to create item:", error);
  return {
    success: false,
    message: await getTranslations("errors.create_failed"),
    code: "internal_server_error",
  };
}
```

#### Best Practices

1. **Input Validation**: Always validate input before database operations
2. **Internationalization**: Use translated error messages from `next-intl`
3. **Type Safety**: Leverage TypeScript for input/output types
4. **Database Operations**: Use Prisma for all database interactions
5. **Logging**: Log errors with context for debugging (see Logger Conventions below)

#### Prisma Imports

**IMPORTANT**: The project uses custom Prisma paths. Always use the correct import paths:

```typescript
// ✅ Correct - Import prisma client instance
import { prisma } from "@/prisma/prisma";

// ✅ Correct - Import types from custom Prisma client
import type { ChatMessageAttachment, Prisma } from "@/prisma/client";

// ❌ Wrong - Don't import from @prisma/client
import { ChatMessageAttachment } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
```

**Reason**: The project uses a custom Prisma output path (`src/prisma/client`) configured in `prisma/schema.prisma`. This ensures:

- Type definitions match the custom client generation
- Proper handling of extended Prisma features (vector extension, etc.)
- Consistent imports across the codebase
- Singleton prisma client instance with proper configuration

**Common Import Patterns**:

```typescript
// Database operations - use prisma instance
import { prisma } from "@/prisma/prisma";
await prisma.user.findMany();

// Type imports - use custom client types
import type { User, Sage, ChatMessageAttachment } from "@/prisma/client";
import type { Prisma } from "@/prisma/client";

// Transaction type
import type { Prisma } from "@/prisma/client";
type PrismaTransaction = Prisma.TransactionClient;
```

### Logger Conventions

The project uses [Pino](https://github.com/pinojs/pino) logger. **IMPORTANT**: Logger only accepts a single parameter.

#### Correct Usage

**Option 1: String only**

```typescript
logger.info("Operation completed");
logger.error("Operation failed");
```

**Option 2: Object with `msg` field**

```typescript
logger.info({
  msg: "Operation completed",
  userId: 123,
  duration: 456,
});

logger.error({
  msg: "Operation failed",
  error: error.message,
  stack: error.stack,
});
```

#### ❌ Incorrect Usage

```typescript
// WRONG: Two parameters
logger.info("Message", { field1: value1 });

// WRONG: Object without msg field (message won't show properly)
logger.info({ field1: value1, field2: value2 });
```

#### Best Practices

1. **Always include `msg` field**: When logging with context, always include the `msg` field first
2. **Use structured logging**: Include relevant context fields for better debugging
3. **Error logging**: Include both `error` message and `stack` trace when available
4. **Child loggers**: Use `logger.child({ contextField: value })` for scoped logging

```typescript
// Create child logger with context
const logger = rootLogger.child({ userId, sessionId });

// All logs from this logger will include userId and sessionId
logger.info({ msg: "User action performed", action: "login" });
```

### Next.js Pages Conventions

#### Page Component Structure

```typescript
// src/app/(feature)/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function Page() {
  // Server-side data fetching
  const data = await fetchData();

  return (
    <Suspense fallback={<Loading />}>
      <PageContent data={data} />
    </Suspense>
  );
}
```

#### Layout Patterns

```typescript
// src/app/(feature)/layout.tsx
import { ReactNode } from "react";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="layout-container">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

#### Route Organization

- **Route Groups**: Use parentheses for logical grouping without affecting URL
  - `(auth)` - Authentication pages
  - `(public)` - Marketing pages
  - `(study)` - Study-related features
  - `(persona)` - Persona management
  - `(interviewProject)` - Interview features

#### Metadata Generation

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("metadata");

  return {
    title: {
      default: t("title"),
      template: "%s | atypica.AI",
    },
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}
```

#### Server vs Client Components

- **Default**: Use server components by default
- **Client Components**: Mark with `"use client"` only when needed for:
  - Event handlers (onClick, onChange)
  - Browser APIs (localStorage, window)
  - State management (useState, useReducer)
  - Effects (useEffect)
  - Context providers

```typescript
// Server Component (default)
async function ServerPage() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// Client Component
"use client";

function ClientComponent({ data }) {
  const [state, setState] = useState(data);
  return <div onClick={() => setState(newData)}>{state}</div>;
}
```

#### Data Fetching

- **Server Components**: Fetch data directly in component
- **Parallel Fetching**: Use Promise.all for multiple requests
- **Streaming**: Use Suspense boundaries for progressive rendering

```typescript
async function Page() {
  const [user, posts] = await Promise.all([
    fetchUser(),
    fetchPosts()
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <Suspense fallback={<PostsSkeleton />}>
        <Posts posts={posts} />
      </Suspense>
    </div>
  );
}
```

### AI SDK (Vercel AI SDK) Conventions

#### Provider Configuration

```typescript
// src/ai/provider.ts
import { createOpenAI, createAnthropic } from "@ai-sdk/openai";

// Configure multiple providers
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// Dynamic model selection based on deployment region
export function llm(modelName: LLMModelName) {
  switch (modelName) {
    case "claude-3-5-sonnet":
      return bedrock("us.anthropic.claude-3-5-sonnet-20241022-v2:0");
    case "gpt-4o":
      return azureEastUS2("gpt-4o");
    case "gemini-2.5-flash":
      return google("gemini-2.0-flash-exp");
    default:
      return openai(modelName);
  }
}
```

#### Streaming Pattern

```typescript
// src/app/api/chat/route.ts
import { streamText } from "ai";
import { llm } from "@/ai/provider";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: llm("gpt-4o"),
    system: "You are a helpful assistant",
    messages,
    tools,

    // Smooth streaming for better UX
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/, // Chinese characters or words
    }),

    // Track steps and persist
    onStepFinish: async (step) => {
      await saveStepToDB(step);
      await trackTokenUsage(step);
    },

    onError: ({ error }) => {
      console.error("AI stream error:", error);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

#### Message Handling

```typescript
// src/ai/messageUtils.ts

// Convert database messages to AI SDK format
export async function convertDBMessagesToAIMessages(dbMessages) {
  return await Promise.all(
    dbMessages.map(async ({ messageId, role, parts, attachments }) => ({
      id: messageId,
      role,
      parts: [...parts.map(convertToV5MessagePart), ...(await processAttachments(attachments))],
    })),
  );
}

// Flatten messages for tool call handling
export function convertToFlattenModelMessages(messages, { tools }) {
  const flattenMessages = messages.flatMap((message) =>
    message.parts.some(isToolUIPart) ? splitMessageOnToolCalls(message) : [message],
  );

  return convertToModelMessages(flattenMessages, { tools });
}
```

#### Tool Definition Pattern

```typescript
// src/ai/tools/customTool.ts
import { tool } from "ai";
import { z } from "zod";

export const customTool = tool({
  description: "Tool description for the AI model",
  parameters: z.object({
    query: z.string().describe("The search query"),
    limit: z.number().optional().describe("Number of results"),
  }),
  execute: async ({ query, limit = 10 }) => {
    const results = await performSearch(query, limit);
    return results;
  },
});

// Usage in streamText
const tools = {
  custom_tool: customTool,
  google_search: google.tools.googleSearch({
    mode: "MODE_DYNAMIC",
    dynamicThreshold: 0.3,
  }),
};
```

#### Tool Type Safety Patterns

**CRITICAL**: Follow these patterns for type-safe tool handling in multi-agent systems.

##### 1. Define Base Tool Set Type

Create a centralized type for all possible tools in your agent system:

```typescript
// src/app/(study)/tools/index.ts
import "server-only";
import { ToolSet } from "ai";
import { ToolName } from "@/ai/tools/types";

// Define all possible tools for study agents
export type StudyToolSet = Partial<{
  [ToolName.webSearch]: ReturnType<typeof webSearchTool>;
  [ToolName.generateReport]: ReturnType<typeof generateReportTool>;
  [ToolName.saveAnalyst]: ReturnType<typeof saveAnalystTool>;
  [ToolName.planPodcast]: ReturnType<typeof planPodcastTool>;
  // ... all other tools
}>;

// Verify it conforms to AI SDK's ToolSet interface
type StudyToolSetCheck = StudyToolSet extends ToolSet ? true : false;
```

**Key points**:

- Use `Partial<{...}>` to allow each agent to use a subset of tools
- Use `ToolName` enum as keys for type safety
- Use `ReturnType<typeof toolFactory>` for factory-created tools
- Use `typeof tool` for direct tool objects
- Verify with type check that it extends AI SDK's `ToolSet`

##### 2. Agent Config with Generic Constraints

Use proper generic constraints for type-safe agent configurations:

```typescript
// src/app/(study)/agents/baseAgentRequest.ts
import { PrepareStepFunction, StepResult, ToolChoice } from "ai";
import { StudyToolSet } from "@/app/(study)/tools";

export interface AgentRequestConfig<TOOLS extends StudyToolSet = StudyToolSet> {
  model: LLMModelName;
  systemPrompt: string;
  tools: TOOLS;
  maxSteps?: number;
  toolChoice?: ToolChoice<TOOLS>;

  specialHandlers?: {
    // Use AI SDK's built-in PrepareStepFunction type
    customPrepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;

    // Custom handler with proper step result typing
    customOnStepFinish?: (step: StepResult<TOOLS>, context: BaseStepContext) => Promise<void>;
  };
}
```

**Key points**:

- `TOOLS extends StudyToolSet` ensures tools are subset of base tool set
- `NoInfer<TOOLS>` prevents TypeScript from widening the type
- Use AI SDK's `PrepareStepFunction` instead of custom interfaces
- `StepResult<TOOLS>` gives type-safe access to tool results

##### 3. Per-Agent Tool Type Definition

Each agent config should define its specific tool set:

```typescript
// src/app/(study)/agents/configs/studyAgentConfig.ts

// Infer exact tool types from build function
type TOOLS = ReturnType<typeof buildStudyTools>;

export async function createStudyAgentConfig(
  params: StudyAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const tools = buildStudyTools(params);

  return {
    model: "claude-sonnet-4",
    systemPrompt,
    tools,

    specialHandlers: {
      customPrepareStep: async ({ messages }) => {
        // Type-safe tool name array - TypeScript knows all possible tool names
        let activeTools: (keyof TOOLS)[] | undefined = undefined;

        if (someCondition) {
          activeTools = [ToolName.generateReport, ToolName.saveAnalyst];
        }

        return { messages, activeTools };
      },
    },
  };
}

function buildStudyTools(params: BuildParams) {
  return {
    [ToolName.webSearch]: webSearchTool(params),
    [ToolName.generateReport]: generateReportTool(params),
    [ToolName.saveAnalyst]: saveAnalystTool(params),
    // ...
  };
}
```

**Key points**:

- Define `type TOOLS = ReturnType<typeof buildTools>` for exact type inference
- `activeTools: (keyof TOOLS)[]` is fully type-safe
- TypeScript will error if you reference a tool not in this agent's tool set

##### 4. Type-Safe Tool Result Handling

Handle tool results without using `any`:

```typescript
// ❌ WRONG: Using any
const tool = step.toolResults.find((t) => t?.toolName === ToolName.generateReport) as any;
const token = tool.output.reportToken; // No type safety!

// ✅ CORRECT: Using StaticToolResult with Pick
import { StaticToolResult } from "ai";
import { StudyToolSet } from "@/app/(study)/tools";

const generateReportTool = step.toolResults.find(
  (tool) =>
    !tool.dynamic && tool.type === "tool-result" && tool.toolName === ToolName.generateReport,
) as StaticToolResult<Pick<StudyToolSet, ToolName.generateReport>> | undefined;

// Type guard for safe access
if (generateReportTool && "output" in generateReportTool && generateReportTool.output) {
  // ✅ Fully type-safe - TypeScript knows the exact output type
  const reportToken = generateReportTool.output.reportToken ?? generateReportTool.input.reportToken;

  await notifyReportCompletion({ reportToken, studyUserChatId, logger });
}
```

**Key points**:

- Use `StaticToolResult<Pick<ToolSet, ToolName.X>>` for non-dynamic tools
- Check `!tool.dynamic && tool.type === "tool-result"` to ensure it's a static result
- Use type guard `"output" in tool` before accessing output
- TypeScript will provide autocomplete and type checking for tool input/output

##### 5. Complete Example: Study Agent

```typescript
// Define tool set type
type TOOLS = ReturnType<typeof buildStudyTools>;

// Create config with proper typing
export async function createStudyAgentConfig(
  params: StudyAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const tools = buildStudyTools(params);

  return {
    model: "claude-sonnet-4",
    systemPrompt: studySystem({ locale: params.locale }),
    tools,

    specialHandlers: {
      // Type-safe prepare step
      customPrepareStep: async ({ messages }) => {
        const toolUseCount = calculateToolUsage(messages);
        let activeTools: (keyof TOOLS)[] | undefined = undefined;

        // Restrict tools after report generation
        if ((toolUseCount[ToolName.generateReport] ?? 0) > 0) {
          activeTools = [
            ToolName.generateReport,
            ToolName.reasoningThinking,
            ToolName.toolCallError,
          ];
        }

        return { messages, activeTools };
      },

      // Type-safe step finish handler
      customOnStepFinish: async (step) => {
        // Type-safe tool result access
        const saveAnalystTool = step.toolResults.find(
          (tool) =>
            !tool.dynamic && tool.type === "tool-result" && tool.toolName === ToolName.saveAnalyst,
        ) as StaticToolResult<Pick<TOOLS, ToolName.saveAnalyst>> | undefined;

        if (saveAnalystTool) {
          await generateChatTitle(params.studyUserChatId);
        }
      },
    },
  };
}
```

#### Token Usage Tracking

```typescript
onStepFinish: async (step) => {
  const { tokens, extra } = calculateStepTokensUsage(step);

  await statReport("tokens", tokens, {
    reportedBy: "chat",
    modelName: step.model,
    userId: session.userId,
    ...extra,
  });
};
```

#### Error Handling and Retries

```typescript
const result = await streamText({
  model: llm("gpt-4o"),
  maxRetries: 3,

  onError: ({ error }) => {
    // Log error for monitoring
    logger.error("AI stream error", {
      error: error.message,
      userId,
      modelName,
    });
  },
});
```

#### Best Practices

1. **Provider Selection**: Use `llm()` function for intelligent provider/model selection
2. **Message Conversion**: Always convert DB messages using utility functions
3. **Tool Handling**: Flatten messages with tool calls before sending to model
4. **Streaming**: Use `smoothStream` for better Chinese character support
5. **Persistence**: Save AI responses and tool calls to database in `onStepFinish`
6. **Token Tracking**: Always track token usage for billing and analytics
7. **Error Logging**: Comprehensive error logging with context
8. **Type Safety**: Leverage Zod schemas for tool parameters
9. **Step Control**: Use `stopWhen` for multi-step reasoning limits
10. **File Attachments**: Process and include file attachments in messages
11. **No Any Types**: Never use `any` - find proper types from AI SDK (`StaticToolResult`, `PrepareStepFunction`)
12. **Static Imports Only**: All imports must be at file top - no `await import()` allowed
13. **Tool Type Patterns**: Use `StaticToolResult<Pick<ToolSet, ToolName.X>>` for type-safe tool result handling
14. **Generic Constraints**: Use `TOOLS extends BaseToolSet` with `NoInfer<TOOLS>` for proper type inference
15. **Study Existing Patterns**: Search codebase for similar implementations before writing new code
