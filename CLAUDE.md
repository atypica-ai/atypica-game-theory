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

The system uses specialized AI agents that collaborate on research tasks:

1. **Study Agent** (`src/app/(study)/`) - Orchestrates research workflows and guides users
2. **Scout Agent** (`src/app/(newStudy)/`) - Observes social media to understand user groups through qualitative observation, uses reasoningThinking for social psychological analysis
3. **Interviewer Agent** (`src/app/(interviewProject)/`) - Conducts professional interviews
4. **Persona Agent** (`src/app/(persona)/`) - Simulates user responses and provides feedback

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

The system provides specialized AI tools located in `src/ai/tools/`:

- **reasoningThinking** - Deep analysis and reasoning; used by Scout after 5 observations to synthesize social psychological insights
- **interview** - Automated interview management
- **scoutTaskChat** - Social media observation and persona building through qualitative analysis (executes in 3 phases: observation → reasoning → validation)
- **generateReport** - Research report generation

### Database Schema

Core entities include:

- **User/Team** - User management with team support
- **Persona** - AI personas with vector embeddings for similarity search
- **UserChat** - Conversation sessions with different kinds (scout, study, interview, etc.)
- **Analyst** - Research analysts conducting studies
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

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
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
