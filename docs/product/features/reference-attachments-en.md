# Reference Studies + File Attachments - AI That Stands on Your Shoulders

## Core Philosophy

atypica.AI isn't just an isolated research tool—it's a **continuously evolving research platform** that builds knowledge over time. Through **Reference Studies** and **File Attachments**, our AI can:

1. **Reference Studies**: Build upon your previous research findings, avoiding redundant work
2. **File Attachments**: Understand uploaded images and documents, integrating them into analysis

These features enable AI to truly "stand on your shoulders" rather than starting from scratch every time.

---

## Quick Comparison: With vs Without Reference Studies + File Attachments

| **Scenario** | **Without Features** | **With Features** |
|---------|------------------------|------------------------|
| **Research Continuity** | Every research starts from zero, AI doesn't remember previous findings | AI automatically loads previous research logs, maintains context |
| **Material Utilization** | Manual copy-paste of document content (limited by input length) | Direct upload of PDFs/images, AI auto-extracts and understands |
| **Research Depth** | Surface-level analysis (re-researching basics every time) | Deep analysis (building on existing findings, jumping to core issues) |
| **Time Efficiency** | Slow (redundant research + manual material organization) | Fast (auto-load background + auto-process files) |
| **Knowledge Accumulation** | Isolated research reports (non-reusable) | Reusable research assets (Research A → Research B → Research C) |

### Real-World Case Comparison

**Scenario**: Research "2025 Electric Vehicle Market Trends"

**Without Reference Studies/File Attachments** (30 minutes):
```
User: "Research 2025 electric vehicle market trends"

AI: Starting webSearch, collecting basic information...
   → Discovers: market size, key players, policy environment
   → 10 minutes later, generates report

User: "Can you analyze user pain points in more depth?"

AI: Starting webSearch again, re-collecting basic information...
   → Another 10 minutes re-researching market background
   → Another 10 minutes analyzing pain points
```

**With Reference Studies/File Attachments** (10 minutes):
```
User: "Research 2025 electric vehicle market trends"

AI: Starting research...
   → 10 minutes later, generates report (Research A)

User: "Based on this research, analyze user pain points in depth. I've also uploaded 2 industry reports."
   [Reference: Research A]
   [Attachments: McKinsey_Report.pdf, iResearch_Report.pdf]

AI: Loading Research A logs + Extracting PDF content
   → Already knows: market size, key players, policy environment (no re-research needed)
   → Directly enters pain point analysis + integrates uploaded reports
   → 5 minutes to generate deep analysis
```

**Efficiency Gains**:
- **Time**: 30 minutes → 15 minutes (50% savings)
- **Depth**: Surface analysis → Deep analysis (building on existing findings)
- **Material Utilization**: Manual copy-paste → Automatic extraction and understanding

---

## Feature 1: Reference Studies

### Core Philosophy

Reference Studies enable AI to "remember" your previous research outcomes and **automatically load and leverage** this background knowledge in new research.

**Analogy**:
- **Traditional Approach**: Writing every paper from Chapter 1, repeatedly introducing background
- **Reference Studies**: Directly citing previous chapters, quickly entering core arguments

### How It Works

#### 1. Automatic Research Log Generation

After each research session completes, atypica.AI automatically generates a `studyLog`:

**Data Source**:
```typescript
// src/app/(study)/agents/studyLog.ts
export async function generateAndSaveStudyLog({
  analyst,
  messages,
  locale,
}) {
  // Automatically extract research process from conversation messages
  const studyLog = await extractStudyLogFromMessages(messages);

  // Save to Analyst.studyLog
  await prisma.analyst.update({
    where: { id: analyst.id },
    data: { studyLog },
  });

  return { studyLog };
}
```

**studyLog Content**:
```markdown
# Research Log

## Research Topic
2025 Electric Vehicle Market Trends

## Research Process
1. Market Size Analysis
   - 2025 projected 8M units (35% YoY growth)
   - Penetration rate reaches 45% (vs 32% in 2024)

2. Key Players
   - Tesla: 18% market share
   - BYD: 22% market share
   - NIO: 8% market share

3. Policy Environment
   - Subsidies extended to 2027
   - Charging infrastructure target: 5M stations

## Key Findings
- Finding 1: High-end market slowing, mid-low end exploding
- Finding 2: Range anxiety remains top pain point (63% of users)
- Finding 3: Intelligence becoming new competitive factor (autonomous driving, infotainment systems)
```

---

#### 2. Referencing Previous Research

In new research, users can reference previous studies:

**Frontend Operation**:
```typescript
// User selects "Reference Study" when creating new research
const referenceTokens = ["abc123", "def456"]; // Tokens of previous research

// Pass to backend
await createStudyChat({
  brief: "Analyze EV user pain points in depth",
  referenceTokens, // Reference previous research
});
```

**Backend Processing**:
```typescript
// src/app/(study)/agents/referenceContext.ts
export async function buildReferenceStudyContext({
  referenceTokens,
  userId,
  locale,
}) {
  // Query referenced studies
  const referenceChats = await prisma.userChat.findMany({
    where: {
      token: { in: referenceTokens },
      userId,
      kind: "study",
    },
    include: {
      analyst: {
        select: {
          studyLog: true, // Load research logs
        },
      },
    },
  });

  // Build reference study background message
  const studySections = referenceChats.map((chat, index) => {
    return `<Reference_Study_${index + 1}>
<Title>${chat.title}</Title>
<Research_Log>${chat.analyst.studyLog}</Research_Log>
</Reference_Study_${index + 1}>`;
  }).join("\n\n");

  return `I've completed some related research previously, and now I want to dive deeper based on those findings. Please carefully review the reference studies below, then leverage these existing discoveries and insights in your upcoming research.

${studySections}

Great, now that you understand the background from these reference studies, let me share the new research question.`;
}
```

---

#### 3. How AI Leverages Reference Studies

Reference study content is injected as the first user message in the conversation:

**Message Structure**:
```typescript
const messages = [
  // Message 1: Reference study background
  {
    role: "user",
    content: `I've completed some related research previously...

<Reference_Study_1>
<Title>2025 Electric Vehicle Market Trends</Title>
<Research_Log>
# Research Log
## Research Topic
...
## Key Findings
- Finding 1: High-end market slowing, mid-low end exploding
- Finding 2: Range anxiety remains top pain point (63% of users)
...
</Research_Log>
</Reference_Study_1>

Great, now that you understand the background, here's the new research question.`
  },

  // Message 2: New research question
  {
    role: "user",
    content: "Analyze EV user pain points in depth, especially the real causes of range anxiety"
  },

  // AI begins research...
];
```

**AI's Research Strategy**:
```
Plan Mode Agent Analysis:
✅ Known Background (from reference studies):
   - Market size: 8M units (2025)
   - Penetration: 45%
   - Key players: Tesla 18%, BYD 22%
   - Core pain point: Range anxiety (63% of users)

❓ New Research Focus:
   - Why do 63% have range anxiety?
   - What are the real causes? (Technical? Psychological? Contextual?)
   - How to address it?

Research Plan:
1. ❌ Skip market background research (already known)
2. ✅ Directly research deep causes of range anxiety
3. ✅ Use scoutTaskChat to observe social media discussions
4. ✅ Use interviewChat for in-depth interviews with 10 users
```

**Key Advantages**:
- **Avoid Redundant Research**: AI already knows market background, no need to webSearch again
- **Jump to Core Issues**: Start directly from previous findings (63% anxiety) and go deeper
- **Context Continuity**: New research is natural continuation of previous work

---

### Use Cases

#### ✅ Suitable for Reference Studies

**1. Progressive Deep-Dive Research**
```
Research A: 2025 EV Market Trends (macro)
   ↓
Research B: EV User Pain Points Deep Analysis (references Research A)
   ↓
Research C: Product Solutions for Range Anxiety (references Research A + B)
```

**2. Cross-Time Comparison Research**
```
Research A: 2024 Q4 Consumer Trends (Dec 2024)
   ↓
Research B: 2025 Q1 Consumer Trends Comparison (Mar 2025, references Research A)
   → AI automatically compares Q4 vs Q1 changes
```

**3. Multi-Dimensional Analysis**
```
Research A: Product Feature Analysis
Research B: User Pain Point Analysis
   ↓
Research C: Product Improvement Plan (references Research A + B)
   → AI combines features and pain points for targeted solutions
```

**4. Team Collaboration Research**
```
Team Member A: Market Research (Research A)
   ↓
Team Member B: Competitive Analysis (Research B, references Research A)
   ↓
Team Member C: Product Positioning (Research C, references Research A + B)
```

---

#### ❌ Not Suitable for Reference Studies

**1. Unrelated New Research**
```
Research A: EV Market Trends
Research B: Coffee Industry Analysis
   → No relation, no need to reference
```

**2. Outdated Research**
```
Research A: 2023 AI Industry Trends
Research B: 2025 AI Industry Trends
   → 2023 data is obsolete, referencing has limited value
```

**3. Contradictory Research Conclusions**
```
Research A: Predicts market will grow
Research B: Predicts market will shrink
Research C: Comprehensive Analysis (references A + B)
   → AI may get confused, better to research separately
```

---

### Data Model

**UserChat** (Research Session):
```typescript
{
  token: string,           // Unique research identifier (for referencing)
  title: string,           // Research title
  kind: "study",           // Session type
  userId: number,          // User ID
  analyst: Analyst,        // Associated analyst
}
```

**Analyst** (Analyst Configuration):
```typescript
{
  studyLog: string,        // Research log (auto-generated)
  topic: string,           // Research topic
  kind: AnalystKind,       // Research type (testing/insights/creation/...)
}
```

**Reference Study Data Flow**:
```
UserChat A (token: "abc123")
   ├─ Analyst
   │    └─ studyLog: "# Research Log\n..."
   │
   └─ Research completed

UserChat B (new research)
   ├─ referenceTokens: ["abc123"]  // Reference Research A
   │
   ├─ buildReferenceStudyContext()
   │    └─ Load Research A's studyLog
   │
   └─ AI starts new research (based on Research A background)
```

---

### Best Practices

#### 1. Progressive Deep-Dive (Recommended)

**Scenario**: Product Innovation Research

```
Step 1: Macro Market Research
User: "Research 2025 AI Assistant Market Trends"
   → Generate Research A (market size, players, trends)

Step 2: Competitive Analysis (reference Research A)
User: "Based on the previous research, analyze differences between ChatGPT, Claude, Gemini"
   [Reference: Research A]
   → AI already knows market background, directly enters competitive analysis

Step 3: Product Positioning (reference Research A + B)
User: "Based on market trends and competitive analysis, provide product positioning"
   [Reference: Research A, Research B]
   → AI combines market and competitors for positioning strategy
```

**Advantages**:
- Each research stands on previous shoulders
- Avoid redundant basic information research
- Research depth progressively increases

---

#### 2. Multi-Angle Comprehensive Analysis

**Scenario**: Product Improvement Decision

```
Research A: User Pain Point Research
   → "Users complain feature X is too complex, success rate only 40%"

Research B: Competitor Feature Research
   → "Competitor Y's similar feature has 85% success rate, simpler design"

Research C: Product Improvement Plan (references A + B)
User: "Based on user pain points and competitive analysis, provide improvement plan for feature X"
   [Reference: Research A, Research B]
   → AI combines pain points and competitors for specific improvement recommendations
```

---

#### 3. Time Series Comparison

**Scenario**: Trend Tracking

```
Research A: 2024 Q4 Consumer Trends (Dec 2024)
   → "Young people prefer health foods, 25% growth"

Research B: 2025 Q1 Consumer Trends (Mar 2025, references A)
User: "Research 2025 Q1 consumer trends, compare changes from Q4"
   [Reference: Research A]
   → AI automatically compares:
      • Q4 → Q1 changes
      • Which trends continue? Which reverse?
      • What are the underlying reasons?
```

---

### Capabilities and Limitations

#### ✅ What Reference Studies Can Do

1. **Auto-Load Background**: AI automatically understands previous research outcomes
2. **Avoid Redundant Research**: Skip known information, quickly enter core topics
3. **Context Continuity**: New research is natural continuation of previous work
4. **Multi-Study Synthesis**: Reference multiple studies simultaneously (up to 5)
5. **Team Collaboration**: Team members can reference each other's research

#### ❌ What Reference Studies Cannot Do

1. **Cross-User References**: Can only reference your own research (privacy protection)
2. **Auto-Update**: Referenced research content is static (doesn't update in real-time)
3. **Selective Referencing**: Cannot reference only part of a study (all or nothing)
4. **Research Merging**: Cannot merge multiple studies into one new study

---

## Feature 2: File Attachments

### Core Philosophy

File Attachments enable AI to "understand" uploaded images and documents, **automatically extracting and processing** this material during research.

**Analogy**:
- **Traditional Approach**: Manually copy-paste document content (limited by length)
- **File Attachments**: Directly upload PDF/images, AI auto-extracts full content

### Supported File Types

#### 1. Image Files (up to 5)

**Supported Formats**:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)
- SVG (.svg)

**Processing Flow**:
```
Upload image
   ↓
Auto-compress and optimize (WebP format, 800-4000px)
   ↓
Convert to Data URL
   ↓
Vision API parsing (Claude/GPT-4 Vision)
   ↓
AI understands image content
```

**Supported Scenarios**:
- **Screenshots**: Web pages, app interfaces, data charts
- **Documents**: Scanned documents, handwritten notes, PPT screenshots
- **Photos**: Product images, field photos, prototype designs
- **Charts**: Data visualizations, flowcharts, architecture diagrams

---

#### 2. Document Files (up to 3)

**Supported Formats**:
- PDF (.pdf)
- Plain text (.txt)
- CSV (.csv)

**Processing Flow**:
```
Upload document
   ↓
Text extraction (PDF → Text, using Jina API)
   ↓
AI compression (GPT-5-mini, < 20K tokens)
   ↓
Store compressed text (AttachmentFile.extra.compressedText)
   ↓
AI understands document content
```

**Supported Scenarios**:
- **Industry Reports**: McKinsey, iResearch, Gartner reports (PDF)
- **Internal Documents**: Company strategy, product PRDs, meeting minutes
- **Data Files**: User research data (CSV)
- **Research Papers**: Academic papers, white papers

---

### File Limitations

```typescript
// src/lib/fileUploadLimits.ts
export const FILE_UPLOAD_LIMITS = {
  MAX_IMAGES: 5,                        // Max 5 images
  MAX_DOCUMENTS: 3,                     // Max 3 documents
  MAX_SINGLE_FILE_SIZE: 3 * 1024 * 1024, // Single file 3MB
  MAX_TOTAL_SIZE: 50 * 1024 * 1024,     // Total size 50MB
} as const;
```

**Validation Logic**:
```typescript
// Check file upload limits
export function checkFileUploadLimits(
  existingFiles: FileUploadInfo[],
  newFile: FileUploadInfo,
): FileUploadCheckResult {
  // 1. Check single file size
  if (newFile.size > FILE_UPLOAD_LIMITS.MAX_SINGLE_FILE_SIZE) {
    return {
      canUpload: false,
      reason: "max-single-file-size",
      message: "Single file cannot exceed 3MB",
    };
  }

  // 2. Check image count
  const images = existingFiles.filter(isImageFile);
  if (isImageFile(newFile.mimeType) && images.length >= FILE_UPLOAD_LIMITS.MAX_IMAGES) {
    return {
      canUpload: false,
      reason: "max-images",
      message: `Maximum ${FILE_UPLOAD_LIMITS.MAX_IMAGES} images allowed`,
    };
  }

  // 3. Check document count
  const documents = existingFiles.filter(isDocumentFile);
  if (isDocumentFile(newFile.mimeType) && documents.length >= FILE_UPLOAD_LIMITS.MAX_DOCUMENTS) {
    return {
      canUpload: false,
      reason: "max-documents",
      message: `Maximum ${FILE_UPLOAD_LIMITS.MAX_DOCUMENTS} documents allowed`,
    };
  }

  // 4. Check total size
  const totalSize = existingFiles.reduce((acc, file) => acc + file.size, 0);
  if (totalSize + newFile.size > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
    return {
      canUpload: false,
      reason: "max-total-size",
      message: "Total file size cannot exceed 50MB",
    };
  }

  return { canUpload: true };
}
```

---

### Document Processing Flow

#### Stage 1: Text Extraction

**PDF Extraction** (using Jina API):
```typescript
// src/ai/reader.ts
export async function parsePDFToText({ name, objectUrl, mimeType }) {
  const fileUrl = await s3SignedUrl(objectUrl);
  rootLogger.info({ msg: "Parsing file with Jina API", name });

  // Call Jina API
  const response = await proxiedFetch("https://r.jina.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({ url: fileUrl }),
  });

  const extractedText = await response.text();
  return extractedText;
}
```

**Plain Text/CSV Extraction**:
```typescript
async function extractFullText(file: AttachmentFile): Promise<string> {
  const { mimeType, objectUrl } = file;

  if (mimeType === "application/pdf") {
    return await parsePDFToText({ name, objectUrl, mimeType });
  }

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const fileUrl = await s3SignedUrl(objectUrl);
    const response = await proxiedFetch(fileUrl);
    return await response.text();
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}
```

---

#### Stage 2: AI Compression

**Why Compression?**
- Raw text may be 50K-200K tokens (e.g., 100-page PDF)
- AI context windows are limited (Claude: 200K tokens)
- Multiple files + conversation history can exceed limits

**Compression Target**:
- Each document < 20K tokens (~60K characters)
- Retain all key information (data, insights, conclusions)
- Remove redundancy (repetitive phrases, meaningless connectors)

**Compression Implementation**:
```typescript
// src/lib/attachments/processing.ts
export async function compressText({
  fullText,
  logger,
  abortSignal,
}): Promise<string> {
  const locale = await detectInputLanguage({ text: fullText });

  const systemPrompt =
    locale === "zh-CN"
      ? `You are a professional information compression expert. Your task is to compress documents, not summarize them.

Core Principles:
- This is information compression, not summarization or distillation
- Maintain all information and meaning from original, don't abstract or extract insights
- Merge sentences where possible, simplify expressions where possible
- Remove redundant modifiers, repetitive phrases, meaningless connectors
- Use compact format: semicolon connections, abbreviations, remove unnecessary words
- Retain all specific facts, data, entities, opinions, and relationships
- Target: <20,000 tokens (~60,000 characters)

Important: Don't change original meaning, don't add inferences or insights not in original.

Output Format: Directly output compressed text content, no explanations, no preamble or closing.`
      : `...`;

  const messages = [
    { role: "user", content: "Here is the original text to compress:" },
    { role: "user", content: fullText },
    {
      role: "user",
      content: "Output all compressed text directly, no explanations, no preamble or closing.",
    },
  ];

  const response = streamText({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      },
    },
    system: systemPrompt,
    messages,
    maxOutputTokens: 20000, // Limit output length
    maxRetries: 3,
    onFinish: () => {
      logger.info({
        msg: "compressText onFinish",
        compressedTextLength: compressedText.length,
      });
      resolve(compressedText);
    },
    abortSignal,
  });

  return compressedText;
}
```

**Compression Example**:

**Original Text** (100K tokens):
```markdown
# 2025 Electric Vehicle Market Trends Report

## Foreword
This report by McKinsey & Company aims to deeply analyze the development trends of the electric vehicle market in 2025. The report is based on surveys of 500 companies and 10,000 consumers, plus deep analysis of the global market...

## Chapter 1: Market Size Analysis
According to our research, the global electric vehicle market is projected to reach 8 million units in 2025, up from 5.9 million in 2024, a 35% YoY increase. This growth is driven by several factors:
1. Government policy support continues to strengthen...
2. Consumer environmental awareness increases...
3. Technological advances reduce costs...
...(95 more pages omitted)
```

**Compressed Text** (18K tokens):
```markdown
# 2025 EV Market Trends (McKinsey)

Based on 500 company + 10K consumer surveys, global market analysis.

## Market Size
2025 projected 8M units (vs 2024 5.9M, +35%). Drivers: policy support, environmental awareness, cost reduction.

## Key Players
Tesla 18%, BYD 22%, NIO 8%; BYD fastest growth (+45% YoY).

## User Pain Points
1. Range anxiety (63% mention): actual vs claimed range gap large (winter -30%)
2. Charging inconvenience (51% mention): insufficient charging station density (1:8 vehicle-station ratio vs ideal 1:1)
3. Low residual value (48% mention): 3-year residual 45% vs ICE 65%

## Core Trends
- High-end market slowing (+12%), mid-low end exploding (+58%)
- Intelligence becoming key differentiator: autonomous driving (L2+ penetration 68%), infotainment (system rating correlation with sales 0.73)
- Policy extended to 2027: subsidies, charging infrastructure (target 5M stations)

...(All key data and insights retained, redundancy removed)
```

**Compression Results**:
- **Length**: 100K tokens → 18K tokens (82% compression)
- **Information Retention**: All key data, insights, trends (100%)
- **Readability**: Compact but complete, AI can understand directly

---

#### Stage 3: Storage

**Data Model**:
```typescript
// prisma/schema.prisma
model AttachmentFile {
  id        Int    @id @default(autoincrement())
  userId    Int
  name      String @db.VarChar(255)        // File name
  mimeType  String @db.VarChar(255)        // MIME type
  size      Int                            // File size (bytes)
  objectUrl String @unique @db.VarChar(255) // S3 URL
  extra     Json   @default("{}")          // Extended fields

  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
}
```

**extra Field** (AttachmentFileExtra):
```typescript
export type AttachmentFileExtra = {
  processing?: {
    startsAt: number;  // Processing start time
  } | false;
  compressedText?: string;  // Compressed text
  error?: string;           // Error message
};
```

**Storage Example**:
```json
{
  "id": 123,
  "userId": 456,
  "name": "McKinsey_EV_Report_2025.pdf",
  "mimeType": "application/pdf",
  "size": 2048000,
  "objectUrl": "s3://bucket/attachments/user-456/file-123.pdf",
  "extra": {
    "processing": false,
    "compressedText": "# 2025 EV Market Trends (McKinsey)\n\nBased on 500 company + 10K consumer surveys...",
    "error": null
  },
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### How AI Uses Attachments

#### 1. Image Attachments (Vision API)

**Processing Flow**:
```typescript
// src/app/(study)/agents/baseAgentRequest.ts
async function waitUntilAttachmentsProcessed({ analyst, locale, streamWriter, streamingMessage }) {
  const attachments = await prisma.chatMessageAttachment.findMany({
    where: {
      userChatId: analyst.userChatId,
      fileType: "image", // Image attachments
    },
    include: {
      attachmentFile: true,
    },
  });

  // Convert images to Data URLs
  const imageParts = await Promise.all(
    attachments.map(async (attachment) => {
      const dataUrl = await fileUrlToDataUrl({
        objectUrl: attachment.attachmentFile.objectUrl,
        mimeType: attachment.attachmentFile.mimeType,
      });

      return {
        type: "image",
        image: dataUrl,
      } as ImagePart;
    })
  );

  // Insert into messages
  return imageParts;
}
```

**Injected into Conversation**:
```typescript
const messages = [
  // Message 1: User input + image attachments
  {
    role: "user",
    content: [
      { type: "text", text: "Analyze this product screenshot, identify design issues" },
      { type: "image", image: "data:image/png;base64,iVBOR..." }, // Image 1
      { type: "image", image: "data:image/png;base64,iVBOR..." }, // Image 2
    ],
  },

  // AI analyzes image content...
];
```

---

#### 2. Document Attachments (Compressed Text)

**Processing Flow**:
```typescript
async function waitUntilAttachmentsProcessed({ analyst, locale, streamWriter, streamingMessage }) {
  const attachments = await prisma.chatMessageAttachment.findMany({
    where: {
      userChatId: analyst.userChatId,
      fileType: "document", // Document attachments
    },
    include: {
      attachmentFile: true,
    },
  });

  // Wait for document processing to complete
  const processedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      const file = await parseAttachmentText(attachment.attachmentFile.id);
      return file;
    })
  );

  // Build document content text
  const documentContents = processedAttachments
    .filter((file) => file.extra.compressedText)
    .map((file) => {
      return `<Document_${file.name}>
${file.extra.compressedText}
</Document_${file.name}>`;
    })
    .join("\n\n");

  return documentContents;
}
```

**Injected into Conversation**:
```typescript
const messages = [
  // Message 1: System-injected document content
  {
    role: "user",
    content: `Below are the reference documents you uploaded, please read carefully:

<Document_McKinsey_EV_Report_2025.pdf>
# 2025 EV Market Trends (McKinsey)

Based on 500 company + 10K consumer surveys, global market analysis.

## Market Size
2025 projected 8M units (vs 2024 5.9M, +35%)...
</Document_McKinsey_EV_Report_2025.pdf>

<Document_iResearch_Consumer_Report_2024.pdf>
# 2024 EV Consumer Research (iResearch)

Survey sample: 10K consumers, covering 50 cities.

## Core Pain Points
1. Range anxiety (63% mention)...
2. Charging inconvenience (51% mention)...
</Document_iResearch_Consumer_Report_2024.pdf>

Now, based on these documents, begin your research.`,
  },

  // Message 2: User's research question
  {
    role: "user",
    content: "Based on these two reports, analyze the real causes of range anxiety in depth",
  },

  // AI begins research (already understands document content)...
];
```

---

### Real-World Examples

#### Case 1: Product Design Analysis + Screenshots

**User Request**:
```
"Analyze this app's homepage design, identify areas for improvement"

[Attachment 1: App_Homepage_Screenshot.png]
[Attachment 2: Competitor_Homepage_Screenshot.png]
[Attachment 3: User_Feedback_Screenshot.png]
```

**AI Processing Flow**:

**Stage 1: Image Parsing**
```
Vision API parses 3 images:

Image 1: App Homepage Screenshot
• Top: Search bar (15% of space)
• Middle: Carousel (30% of space)
• Bottom: Feature entries (8 icons, tightly arranged)
• Overall: High information density, visually crowded

Image 2: Competitor Homepage Screenshot
• Top: Simple navigation
• Middle: Large image + title (50% of space)
• Bottom: 2-3 core feature entries
• Overall: Ample white space, visually clean

Image 3: User Feedback Screenshot
• Comment 1: "Homepage too messy, don't know where to start"
• Comment 2: "Too many features, can't find what I want"
• Comment 3: "Hope to simplify"
```

**Stage 2: Comparative Analysis**
```
AI Analysis:

Design Issues:
1. Information density too high (homepage vs competitor: 8 entries vs 2-3)
2. Visual hierarchy unclear (carousel + feature entries have equal weight)
3. Users complain "too messy" (corresponds to issues 1 and 2)

Improvement Recommendations:
1. Streamline feature entries: 8 → 3-4 core features
2. Strengthen visual hierarchy: increase core feature area proportion (30% → 50%)
3. Add white space: reduce element density, improve breathing room
4. Optimize carousel: reduce to 1-2 items, highlight core value

Reference Competitor Designs:
• Competitor A: Large image + 2 core entries (simple and powerful)
• Competitor B: Title + 3 feature cards (clear and intuitive)
```

**User Experience**:
- **No Need to Describe Images**: Direct upload, AI auto-understands
- **Multi-Image Comparison**: Simultaneously analyzes own + competitors + user feedback
- **Structured Output**: Issues + recommendations + reference cases

---

#### Case 2: Industry Research + PDF Reports

**User Request**:
```
"Based on these two reports, analyze core opportunities in 2025 EV market"

[Attachment 1: McKinsey_EV_Report_2025.pdf (50 pages, 2.5MB)]
[Attachment 2: iResearch_Consumer_Report_2024.pdf (80 pages, 2.8MB)]
```

**AI Processing Flow**:

**Stage 1: Document Processing** (5 minutes)
```
Document 1: McKinsey_EV_Report_2025.pdf
• Extract text: 50 pages → 100K tokens
• AI compression: 100K tokens → 18K tokens
• Store: AttachmentFile.extra.compressedText

Document 2: iResearch_Consumer_Report_2024.pdf
• Extract text: 80 pages → 150K tokens
• AI compression: 150K tokens → 19K tokens
• Store: AttachmentFile.extra.compressedText
```

**Stage 2: AI Research** (5 minutes)
```
Load document content → Analyze core opportunities

Extract from McKinsey Report:
• Market size: 2025 8M units (+35%)
• Fastest growth: mid-low end market (+58%)
• Key trend: intelligence (L2+ penetration 68%)

Extract from iResearch Report:
• Core pain points: range anxiety (63%), charging inconvenience (51%)
• Willingness to pay: willing to pay 10-20% more for intelligence (72% of users)
• Decision factors: intelligence > range > price (ranking shift)

Comprehensive Analysis → Core Opportunities:
1. Mid-low end market (+58% growth)
   • Opportunity: value-for-money models + basic intelligence
   • Target customers: first-time buyers, 150-250K budget

2. Intelligence upgrade (72% willing to pay)
   • Opportunity: L2+ autonomous driving + smart infotainment
   • Differentiation: software experience > hardware specs

3. Charging experience optimization (51% pain point)
   • Opportunity: fast charging network + charging convenience services
   • Partnerships: collaborate with charging station operators

Data Support:
• McKinsey: mid-low end growth +58%
• iResearch: 72% willing to pay for intelligence
• iResearch: 51% complain about charging inconvenience
```

**User Experience**:
- **No Manual Excerpting**: 130 pages of PDF auto-extracted and compressed
- **Cross-Document Analysis**: Synthesizes data and insights from both reports
- **Data-Backed**: All conclusions have clear sources

---

### Capabilities and Limitations

#### ✅ What File Attachments Can Do

**Image Attachments**:
1. **Screenshot Analysis**: App interfaces, web design, data charts
2. **Document Scanning**: Handwritten notes, PPT screenshots, meeting whiteboards
3. **Photo Recognition**: Product images, field photos, prototype designs
4. **Chart Interpretation**: Bar charts, line charts, pie charts, flowcharts

**Document Attachments**:
1. **PDF Parsing**: Industry reports (McKinsey, iResearch, Gartner)
2. **Text Extraction**: Company strategy, product PRDs, meeting minutes
3. **Data Import**: CSV user research data
4. **Paper Understanding**: Academic papers, white papers

**Processing Capabilities**:
1. **Auto-Extraction**: No manual copy-paste needed
2. **Smart Compression**: Retain key information, remove redundancy (< 20K tokens)
3. **Cross-File Analysis**: Understand multiple files simultaneously (up to 5 images + 3 documents)
4. **Structured Output**: AI auto-organizes and analyzes file content

---

#### ❌ What File Attachments Cannot Do

**Image Limitations**:
1. **Low-Quality Images**: Blurry, distorted, or too dark images have low recognition rates
2. **Complex Charts**: Overly complex charts (e.g., tables with 50+ metrics) may be parsed incompletely
3. **Video Files**: Videos not supported (only static images)

**Document Limitations**:
1. **Word/Excel/PPT**: Not currently supported (only PDF/TXT/CSV)
2. **Encrypted PDFs**: Cannot parse encrypted or password-protected PDFs
3. **Image-Based PDFs**: Scanned PDFs (pure images) have low recognition rates (need OCR)
4. **Very Large Documents**: > 200 pages of PDF may lose some information after compression

**Processing Limitations**:
1. **Real-Time Processing**: Document processing takes 2-5 minutes (depending on file size)
2. **Format Preservation**: Compression loses formatting (e.g., table borders, colors)
3. **Image Content**: Images within PDFs are not extracted (text only)

---

## Combined Use: Reference Studies + File Attachments

### Scenario 1: Progressive Research Based on Reports

```
Step 1: Upload industry report (file attachment)
User: "Based on this McKinsey report, analyze 2025 EV market"
   [Attachment: McKinsey_EV_Report_2025.pdf]
   → AI extracts report content, generates Research A

Step 2: Deep dive (reference study + new upload)
User: "Based on previous research, analyze user pain points in depth. I found iResearch report too."
   [Reference: Research A]
   [Attachment: iResearch_Consumer_Report_2024.pdf]
   → AI already knows McKinsey report content (from Research A)
   → Newly extracts iResearch report content
   → Synthesizes both reports for deep pain point analysis

Step 3: Product solution design (reference studies + new screenshots)
User: "Based on market analysis and user pain points, design product solution. Here are competitor screenshots."
   [Reference: Research A, Research B]
   [Attachment: Competitor_A_Screenshot.png, Competitor_B_Screenshot.png]
   → AI already knows market background (Research A) and user pain points (Research B)
   → Newly analyzes competitor screenshots
   → Synthesizes for product solution design
```

---

### Scenario 2: Team Collaboration Research

```
Team Member A: Market Research
   [Attachments: Industry_Report_1.pdf, Industry_Report_2.pdf]
   → Generate Research A (market size, trends, players)

Team Member B: Competitive Analysis (based on A's market research)
   [Reference: Research A]
   [Attachments: Competitor_Screenshot_1.png, Competitor_Screenshot_2.png]
   → Generate Research B (competitor features, design, positioning)

Team Member C: Product Positioning (based on A + B)
   [Reference: Research A, Research B]
   [Attachments: User_Research_Data.csv]
   → Generate Research C (product positioning, differentiation, pricing strategy)
```

---

## Best Practices

### 1. File Naming Conventions

**Recommended Naming**:
```
✅ Good naming:
• McKinsey_EV_Report_2025.pdf
• iResearch_Consumer_Survey_2024Q4.pdf
• Competitor_A_Homepage_Screenshot_20250115.png
• User_Feedback_Bug_List_v2.csv

❌ Poor naming:
• Report.pdf (can't distinguish)
• Screenshot1.png (can't identify content)
• New_Text_Document.txt (meaningless)
• download (1).pdf (machine naming)
```

**Naming Rules**:
- Include source (e.g., "McKinsey", "iResearch")
- Include content (e.g., "Market Report", "User Survey")
- Include time (e.g., "2025", "2024Q4")
- Use underscores as separators (easier to identify)

---

### 2. File Selection Strategy

**Image Selection**:
```
✅ High-quality images:
• Clear screenshots (resolution 1920x1080+)
• Complete interfaces (no cropping)
• Bright photos (no over-dark or over-exposure)
• Structured charts (with titles, legends)

❌ Low-quality images:
• Blurry photos
• Partially cropped screenshots
• Over-dark or over-exposed photos
• Phone photos of screens (with moire patterns)
```

**Document Selection**:
```
✅ Suitable for upload:
• Formal industry reports (McKinsey, iResearch, Gartner)
• Structured documents (with chapters, headings, data)
• Text-based PDFs (text can be copied)
• Data tables (CSV format)

❌ Not suitable for upload:
• Scanned PDFs (pure images, need OCR)
• Encrypted PDFs (cannot parse)
• Word/PPT documents (not yet supported)
• Very large documents (> 200 pages)
```

---

### 3. Upload Timing

**Best Timing**:
```
✅ Upload at research start:
   "Based on this report, analyze market trends"
   [Attachment: Industry_Report.pdf]
   → AI understands document content from the start

❌ Upload mid-research:
   "Analyze market trends" (AI starts research)
   → 10 minutes later
   "Oh right, I have a report, let me upload it"
   → AI already completed research, needs to restart
```

---

### 4. Multi-File Organization

**Recommended Approach**:
```
✅ Categorized upload:
• Group 1: Market reports (2-3 PDFs)
   "Based on these reports, analyze market"
   [McKinsey_Report.pdf, iResearch_Report.pdf, Gartner_Report.pdf]

• Group 2: Competitor screenshots (3-5 images)
   "Analyze competitor design"
   [Competitor_A_Homepage.png, Competitor_B_Features.png, Competitor_C_Pricing.png]

❌ Chaotic upload:
   "Analyze these materials"
   [Report1.pdf, Screenshot1.png, Report2.pdf, Screenshot2.png, ...]
   → AI struggles to understand relationships between files
```

---

## Technical Details

### Data Model

**AttachmentFile** (File Storage):
```typescript
{
  id: number,
  userId: number,
  name: string,                // File name
  mimeType: string,            // MIME type
  size: number,                // File size (bytes)
  objectUrl: string,           // S3 URL
  extra: {
    processing?: { startsAt: number } | false,
    compressedText?: string,   // Compressed text (documents)
    error?: string,             // Error message
  },
  createdAt: DateTime,
}
```

**ChatMessageAttachment** (Attachment Association):
```typescript
{
  chatMessageId: number,       // Associated message ID
  attachmentFileId: number,    // Associated file ID
  fileType: "image" | "document",
}
```

---

### Processing Flow

**Complete Flow Diagram**:
```
User uploads file
   ↓
Frontend validation (file type, size, count)
   ↓
Upload to S3 (generate objectUrl)
   ↓
Create AttachmentFile record
   ↓
Associate with ChatMessage (ChatMessageAttachment)
   ↓
Document processing (background async)
   ├─ Extract text (Jina API for PDF)
   ├─ AI compression (GPT-5-mini, < 20K tokens)
   └─ Store in AttachmentFile.extra.compressedText
   ↓
AI execution loads attachments
   ├─ Images: Convert to Data URL → Vision API
   └─ Documents: Load compressedText → Inject into messages
   ↓
AI understands attachment content → Begin research
```

---

### Key Files

**File Upload**:
- `src/lib/fileUploadLimits.ts` - File upload limits
- `src/hooks/use-file-upload-manager.ts` - File upload manager hook
- `src/lib/attachments/actions.ts` - File upload server actions

**File Processing**:
- `src/lib/attachments/processing.ts` - Document text extraction and compression
- `src/ai/reader.ts` - PDF parsing (Jina API)
- `src/lib/attachments/lib.ts` - Image to Data URL conversion

**AI Integration**:
- `src/app/(study)/agents/baseAgentRequest.ts` - Universal attachment processing
- `src/app/(study)/agents/utils.ts` - `waitUntilAttachmentsProcessed()`
- `src/app/(study)/agents/referenceContext.ts` - Reference study building

---

## FAQ

### 1. What's the difference between Reference Studies and File Attachments?

**Reference Studies**:
- **Source**: Previously completed research (within atypica.AI)
- **Content**: Research logs (studyLog)
- **Purpose**: Continue context, avoid redundant research

**File Attachments**:
- **Source**: User-uploaded files (external materials)
- **Content**: Images, PDF, TXT, CSV
- **Purpose**: Understand external materials, integrate with research

**Analogy**:
- **Reference Studies** = Your previous paper drafts
- **File Attachments** = Reference materials you've collected

---

### 2. Can I use Reference Studies and File Attachments together?

**Yes!** This is the most powerful combination.

**Example**:
```
Research A: Market Research (completed Dec 2024)
   [Attachments: Industry_Report_1.pdf, Industry_Report_2.pdf]
   → Market size, trends, players

Research B: Competitive Analysis (Jan 2025, references A)
   [Reference: Research A]
   [Attachments: Competitor_Screenshot_1.png, Competitor_Screenshot_2.png, Competitor_Report.pdf]
   → AI already knows market background (Research A)
   → Newly analyzes competitor screenshots and report
   → Generates competitive comparison analysis
```

---

### 3. How long does document processing take?

**Processing Time** (depends on file size):
- **Small documents** (< 20 pages): 1-2 minutes
- **Medium documents** (20-50 pages): 2-3 minutes
- **Large documents** (50-100 pages): 3-5 minutes
- **Very large documents** (100-200 pages): 5-10 minutes

**Processing Steps**:
1. Text extraction (Jina API): 30-60 seconds
2. AI compression (GPT-5-mini): 1-4 minutes (depends on document length)
3. Storage (database): < 1 second

**User Experience**:
- Processing happens asynchronously in background
- User can continue operations (e.g., input research questions)
- AI waits for document processing to complete before starting research

---

### 4. Why compress documents?

**Reasons**:
1. **Context Limits**: AI context windows are limited (Claude: 200K tokens)
2. **Efficiency Optimization**: Compressed documents are more compact, AI understands faster
3. **Cost Reduction**: Reduces token consumption, lowers API costs

**Compression Results**:
- **Original Document**: 100-page PDF = 100K tokens
- **After Compression**: 18K tokens (82% compression)
- **Information Retention**: 100% (all key data, insights, conclusions)

**Compression Principles**:
- Retain all key information (data, insights, conclusions)
- Remove redundancy (repetitive phrases, meaningless connectors)
- Use compact format (semicolon connections, abbreviations)

---

### 5. Can I upload Word/Excel/PPT files?

**Currently not supported**, only:
- **Images**: JPEG, PNG, GIF, WebP, BMP, SVG
- **Documents**: PDF, TXT, CSV

**Workarounds**:
1. **Word → PDF**: Export as PDF then upload
2. **Excel → CSV**: Export as CSV then upload
3. **PPT → PDF**: Export as PDF then upload

**Future Plans**:
- Support Word (.docx)
- Support Excel (.xlsx)
- Support PowerPoint (.pptx)

---

### 6. What's different about image vs document processing?

**Image Processing**:
- **Extraction Method**: Vision API (Claude/GPT-4 Vision)
- **Processing Time**: Real-time (< 1 second)
- **Content Understanding**: AI directly "sees" image content
- **Use Cases**: Screenshots, photos, charts, design mockups

**Document Processing**:
- **Extraction Method**: Text extraction (Jina API) + AI compression
- **Processing Time**: 2-5 minutes (background async)
- **Content Understanding**: AI understands compressed text
- **Use Cases**: Reports, papers, PRDs, meeting minutes

---

### 7. Is there a limit on number of Reference Studies?

**Yes**: Maximum **5** referenced studies

**Reasons**:
- **Context Limits**: Each research studyLog is ~10-20K tokens
- **Comprehensibility**: Too many references may confuse AI

**Best Practices**:
- Reference 1-2 related studies (most common)
- Reference 3-4 studies (suitable for multi-dimensional analysis)
- Avoid 5+ references (context overload)

---

### 8. How many tokens do file attachments consume?

**Images**:
- **Single image**: ~1K-2K tokens (depends on complexity)
- **5 images**: ~5K-10K tokens

**Documents**:
- **Single document**: < 20K tokens (after compression)
- **3 documents**: < 60K tokens

**Total** (maximum configuration):
- 5 images + 3 documents = ~70K tokens
- Conversation history + attachments = ~100K tokens (within Claude's 200K limit)

---

## Summary

**Reference Studies + File Attachments** are core capabilities of atypica.AI, enabling AI to truly "stand on your shoulders":

### Core Value

**1. Continuous Accumulation**
- Each research generates `studyLog`, referenceable by future research
- Knowledge isn't isolated, forms reusable research assets

**2. Deep Integration**
- Auto-extract document content (PDF/images)
- Smart compression (< 20K tokens), retain all key information
- Cross-file analysis (understand multiple materials simultaneously)

**3. Efficiency Gains**
- Avoid redundant research (reference previous work)
- No manual excerpting (auto-extract and compress)
- Jump to core issues (build on existing background)

---

### Use Cases

**Reference Studies**:
- ✅ Progressive deep-dive research (macro → micro)
- ✅ Cross-time comparison research (Q4 vs Q1)
- ✅ Multi-dimensional comprehensive analysis (market + competitors + users)
- ✅ Team collaboration research (Member A → Member B → Member C)

**File Attachments**:
- ✅ Industry report analysis (McKinsey, iResearch, Gartner)
- ✅ Product design analysis (app screenshots, competitor screenshots)
- ✅ User research data (CSV data tables)
- ✅ Internal document integration (PRDs, strategy, meeting minutes)

---

### Relationship with Other Features

```
Plan Mode (Intent Clarification Layer)
    ↓
Reference Studies + File Attachments (Background Loading)
    ↓
Study Agent / Fast Insight Agent (Execution Layer)
    ↓
Memory System (Persistent Memory)
```

**Feature Synergy**:
- **Plan Mode**: Determines whether to reference studies or upload files
- **Reference Studies**: Loads previous research logs
- **File Attachments**: Extracts and compresses user-uploaded materials
- **Memory System**: Persists user preferences and research habits

---

**Related Documentation**:
- [Plan Mode Value Proposition](./plan-mode.md) - Understanding research intent clarification
- [Fast Insight Agent](./fast-insight-agent.md) - Understanding podcast-driven research
- [Memory System Mechanics](./memory-system.md) - Understanding persistent memory
- [Scout Agent Deep Dive](./scout-agent.md) - Understanding social media observation
