Web Search Tool
The web search tool enables autonomous web research with optional domain filtering and image understanding:

```
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

const { text, sources } = await generateText({
  model: xai.responses('grok-4-fast'),
  prompt: 'What are the latest developments in AI?',
  tools: {
    web_search: xai.tools.webSearch({
      allowedDomains: ['arxiv.org', 'openai.com'],
      enableImageUnderstanding: true,
    }),
  },
});
```

Web Search Parameters
allowedDomains string[]

Only search within specified domains (max 5). Cannot be used with excludedDomains.

excludedDomains string[]

Exclude specified domains from search (max 5). Cannot be used with allowedDomains.

enableImageUnderstanding boolean

Enable the model to view and analyze images found during search. Increases token usage.

X Search Tool
The X search tool enables searching X (Twitter) for posts, with filtering by handles and date ranges:
```
const { text, sources } = await generateText({
  model: xai.responses('grok-4-fast'),
  prompt: 'What are people saying about AI on X this week?',
  tools: {
    x_search: xai.tools.xSearch({
      allowedXHandles: ['elonmusk', 'xai'],
      fromDate: '2025-10-23',
      toDate: '2025-10-30',
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    }),
  },
});
```

X Search Parameters
allowedXHandles string[]

Only search posts from specified X handles (max 10). Cannot be used with excludedXHandles.

excludedXHandles string[]

Exclude posts from specified X handles (max 10). Cannot be used with allowedXHandles.

fromDate string

Start date for posts in ISO8601 format (YYYY-MM-DD).

toDate string

End date for posts in ISO8601 format (YYYY-MM-DD).

enableImageUnderstanding boolean

Enable the model to view and analyze images in X posts.

enableVideoUnderstanding boolean

Enable the model to view and analyze videos in X posts.