export interface ChangelogEntry {
  version: string;
  date: string;
  items: {
    title: string;
    description?: string;
    subitems?: string[];
  }[];
}

export interface ChangelogSection {
  title: string;
  versions: ChangelogEntry[];
}

export const changelogDataEN: ChangelogSection[] = [
  {
    title: "v2.3.x: Intelligent Memory & Intent Understanding",
    versions: [
      {
        version: "v2.3.0",
        date: "2026-01-08",
        items: [
          {
            title:
              '🧠 Major Feature: <a href="https://atypica.ai/account/capabilities" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">User Memory System</a>',
            description:
              "Established persistent memory system where AI automatically remembers user preferences, habits, and contextual information for personalized service. Two-layer memory architecture (Core Memory + Working Memory) with intelligent reorganization and compression. New user capabilities page to view and edit personal memory anytime. Supports both user-level and team-level memory management. As conversations grow, AI understanding deepens without requiring repeated explanations.",
          },
          {
            title: "🎯 Major Feature: Intelligent Research Planning (Plan Mode)",
            description:
              "Brand new research initiation experience: AI automatically understands your needs, determines the most suitable research type (Product Testing/Market Insights/Content Creation/Strategic Planning, etc.), and displays a complete research plan. Confirm with one click to start, no repeated back-and-forth needed. Added AI-generated research scenario shortcuts tailored to your role (Product Manager, Marketer, Startup Owner, Creator, Consultant, Influencer) to inspire your research direction. All research types now support advanced features like referencing existing research, uploading files, and MCP tool integration. Upgraded to Claude Sonnet 4.5 model for more accurate understanding and faster response.",
          },
          {
            title: "🎨 Design & Experience Optimization",
            description:
              'Added design philosophy documentation: "The Less AI, The More AI" core principle. Optimized report and podcast generation prompts to emphasize research findings over methodology. Cover generation shifted from fixed style to dynamic selection. Instagram migrated to v2 API. Notification system migrated to Intercom event tracking.',
          },
        ],
      },
    ],
  },
  {
    title: "v2.2.x: Group Research & Discussion Mode",
    versions: [
      {
        version: "v2.2.0",
        date: "2025-12-27",
        items: [
          {
            title: "💬 Major Feature: discussionChat Discussion Mode",
            description:
              "Added discussionChat as alternative to interviewChat, supporting group discussion scenarios. discussionChat for viewpoint collision and solution testing (3-8 participants), interviewChat for deep personal insights (5-10 participants). AI automatically selects the most appropriate research method during planning phase based on objectives. Completed studyLog architecture migration from database fields to message-driven architecture, where all research content flows through messages for unified flexibility.",
          },
        ],
      },
    ],
  },
  {
    title: "v2.1.x: AI Research Platform & Developer Tools",
    versions: [
      {
        version: "v2.1.3",
        date: "2025-12-11",
        items: [
          {
            title: "🚀 Major Feature: Fast Insight",
            description:
              "Brand new fast research mode focused on rapidly generating high-quality podcast content. Five-stage automated workflow: Topic Understanding → Podcast Planning → Deep Research → Podcast Generation → Completion. Dual-model collaboration using Claude 3.7 Sonnet and Gemini 2.5 Pro. Intelligent podcast content strategy and search strategy planning, automatically generates opinion-oriented podcast scripts and audio.",
          },
          {
            title: "📽️ UX Improvements: Enhanced Replay Feature",
            description:
              "Added cinematic intro animation effects and progress bar to display research progress. Supports quick jump to report functionality, optimized visual hierarchy and console display.",
          },
          {
            title: "⚡ Technical Optimizations",
            description:
              "Database performance optimization (foreign key indexes, N+1 query fixes, Token deadlock resolution). System enhancements (interview project import/export, mobile menu, security updates, etc.). Code refactoring and cleanup for improved system stability and maintainability.",
          },
        ],
      },
      {
        version: "v2.1.2",
        date: "2025-12-05",
        items: [
          {
            title: "🔬 Core Feature: Deep Research MCP Service",
            description:
              "Implemented Deep Research functionality as an MCP (Model Context Protocol) service. Supports multiple research experts: Grok Expert, Trend Explorer, and more. Integrated Perplexity Sonar Pro for high-quality web searches. Provides standard MCP API interface for third-party integration with streaming output support.",
          },
          {
            title:
              '🔑 Developer Feature: <a href="https://atypica.ai/account" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">API Key Management</a>',
            description:
              "Users can create and manage personal API Keys. Teams support multi-member API Key management with permission validation and ownership control. Deep Research MCP endpoint supports API Key authentication.",
          },
          {
            title: "🎨 Content Enhancement: AI-Generated Cover Images",
            description:
              "Reports and podcasts support AI auto-generated cover images (integrated Gemini 2.5 Flash Image model). Supports custom aspect ratio and layout controls, podcast RSS supports platform-specific cover ratios.",
          },
        ],
      },
      {
        version: "v2.1.1",
        date: "2025-12-03",
        items: [
          {
            title:
              '🎯 Full Launch: <a href="https://atypica.ai/newstudy" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Product R&D Flow</a>',
            description:
              'New "Product R&D" research template focusing on market trends, user needs, and creative ideation. Optimized research workflow and report structure for product innovation scenarios. Helps teams quickly validate product ideas and market opportunities.',
          },
        ],
      },
      {
        version: "v2.1.0",
        date: "2025-11-21",
        items: [
          {
            title:
              '💎 New Plans: <a href="https://atypica.ai/pricing#unlimited" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Unlimited Subscriptions</a>',
            description:
              "Launched Super (personal) and SuperTeam (team) unlimited token plans. Unlimited token usage for high-intensity research needs. Flexible team member management and subscription controls.",
          },
          {
            title: "🏢 Enterprise Features Upgrade",
            description:
              'Comprehensive <a href="https://atypica.ai/pricing#organization" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Pricing page</a> overhaul with enterprise feature showcase. Enterprise-exclusive features: custom development, dedicated customer success, API access, etc. Optimized enterprise lead collection with enhanced information gathering.',
          },
          {
            title: "🔒 SOC 2 Certification",
            description:
              "Platform achieved SOC 2 security compliance certification. Certification badges displayed across website, pricing, and enterprise pages. Enhanced enterprise-grade security and compliance assurance.",
          },
          {
            title: "🤝 Launch: Affiliate Program",
            description:
              'Officially launched <a href="https://friends.atypica.ai" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">friends.atypica.ai</a> affiliate platform. Integrated Tolt tracking system for referral links and commission management. Automatic tracking of referral sources for user signups and payments.',
          },
        ],
      },
    ],
  },
  {
    title: "v2.0.x: Multimodal Research & Content Generation",
    versions: [
      {
        version: "v2.0.2",
        date: "2025-11-01",
        items: [
          {
            title:
              '🧠 Major Feature: <a href="https://atypica.ai/sage" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">AI Expert Agents (Sage)</a>',
            description:
              "Launched evolvable AI expert agent system. Two-layer memory architecture (Core Memory + Working Memory) supporting long-term knowledge accumulation. Intelligent knowledge gap identification with automatic supplementary interviews. Builds continuously evolving domain experts through continuous learning and knowledge supplementation. Supports version control and knowledge source management for expert knowledge traceability.",
          },
        ],
      },
      {
        version: "v2.0.1",
        date: "2025-10-25",
        items: [
          {
            title:
              '🎧 Full Launch: <a href="https://atypica.ai/insight-radio" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Study-to-Podcast Generation</a>',
            description:
              'Research reports can now be converted into podcast audio with one click, supporting online listening and downloading. Multiple podcast styles available: deep dive analysis, opinion discussion, and debate format. Intelligent script generation with automatic host dialogue configuration. Email notifications sent when podcast generation is complete. Full functionality available to <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Pro, Max, and Team plan</a> subscribers.',
          },
        ],
      },
      {
        version: "v2.0.0",
        date: "2025-10-15",
        items: [
          {
            title:
              '🎤 Major Upgrade: <a href="https://atypica.ai/interview" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Interview System</a> Enhancements',
            description:
              "Added multiple-choice question support for richer interview formats. Interview reports can be generated, shared, and downloaded as PDF. Share interview projects via invite links with configurable expiration. Set preferred form of address for interviewees. Multi-language interview support (Chinese and English). File attachment support in interview conversations.",
          },
          {
            title:
              '🧑‍💼 Enhanced: <a href="https://atypica.ai/persona" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Persona System</a>',
            description:
              "Personas can now be shared via public access links. Persona chat supports file uploads as conversation context. Improved search and filtering with tag and preview features.",
          },
          {
            title: "✨ Improved: Research Workflow",
            description:
              "New AI-powered recommendations for research next steps. Continue deeper exploration based on existing research with reference context. Unified management interface for reports and podcasts for easier access and sharing.",
          },
          {
            title: "🚀 Performance & Stability",
            description:
              "AI engine upgraded for improved response speed and stability. Enhanced multi-model support optimizing cost and performance balance. System architecture optimizations for better overall user experience.",
          },
        ],
      },
    ],
  },
  {
    title: "v1.9.x: Guided Research Strategy & Transparency",
    versions: [
      {
        version: "v1.9.0",
        date: "2025-09-15",
        items: [
          {
            title: "🗺️ Guided Planning Before AI Research Starts",
            description:
              "Previously, AI research jumped straight into interviews and search. Now every study begins with a visible plan that outlines who will be contacted, what will be investigated, and why each step matters.",
          },
          {
            title: "🧠 AI Research Strategy Templates",
            description:
              "The planning step automatically selects the right business analysis frameworks (JTBD, STP, GE matrix, etc.) so teams understand the strategic lens behind the upcoming interviews and desk research.",
          },
          {
            title: "📝 Pre-Report Research Log",
            description:
              "Before the final report is generated, the AI prepares a detailed research log that summarizes collected information and key decisions to give context behind the conclusions.",
          },
        ],
      },
    ],
  },
  {
    title: "v1.8.x: AI Interview & AI Persona Full Launch",
    versions: [
      {
        version: "v1.8.0",
        date: "2025-09-04",
        items: [
          {
            title:
              '🚀 Full Launch: <a href="https://atypica.ai/interview" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Interview Project</a> & <a href="https://atypica.ai/persona" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">AI Persona Import</a>',
            description: "Both features now available to all plans (removed preview/beta status)",
            subitems: [
              '<a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Free/Pro plans</a>: Access to limited features',
              '<a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Max/Team plans</a>: Access to full functionality',
            ],
          },
          {
            title: "✨ Major Feature: AI Interview Question Optimization",
            subitems: [
              "AI automatically analyzes your interview project brief and optimizes questions for better research outcomes",
              "Transforms complex questions into clear, answerable segments following research best practices",
              "Applies fact-first methodology and generates granular questions to capture deeper insights",
              "Works seamlessly with both human interviews and AI persona interviews",
            ],
          },
          {
            title: "🎨 UX Improvements",
            subitems: [
              "Enhanced voice input speed and responsiveness",
              "Redesigned persona import workflow with better status visibility",
            ],
          },
        ],
      },
    ],
  },
  {
    title: "v1.7.x: Enterprise Collaboration & Data Insights",
    versions: [
      {
        version: "v1.7.1",
        date: "2025-08-08",
        items: [
          {
            title:
              '✨ Feature: <a href="https://atypica.ai/team" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Team Management</a>',
            description:
              "Added team workspaces, supporting member invitations, removal, and role management. Implemented user identity switching for seamless work between personal and team spaces. Introduced dedicated routes and navigation menus for the team edition.",
          },
        ],
      },
      {
        version: "v1.7.0",
        date: "2025-08-01",
        items: [
          {
            title:
              '✨ Core Feature: Build Private <a href="https://atypica.ai/persona" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">AI Personas (AI Persona Import)</a> [Beta]',
            description:
              'Launched the core <code>AI Persona Import</code> feature, opening up a <strong>public beta for <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Max plan</a> users</strong>. Users can upload their own interview transcripts (<code>PDF</code>, <code>JSON</code>, <code>CSV</code>) to build completely private <code>Human AI Personas (Proprietary)</code>. The AI provides multi-dimensional analysis and scoring for the uploaded content, generating an interactive <code>AI Persona</code> and visualizing the analysis with tools like radar charts.',
          },
        ],
      },
    ],
  },
  {
    title: "v1.6.x: Globalization & Intelligent Enhancement",
    versions: [
      {
        version: "v1.6.2",
        date: "2025-07-28",
        items: [
          {
            title: "🚀 UX: Speech Recognition Upgrade",
            description:
              "Integrated <code>Groq Whisper</code> API for near real-time, streaming transcription, dramatically improving the fluency of voice interviews (2025-07-04).",
          },
          {
            title: "🌱 Development: New Interview Project",
            description:
              "Completed the core development of the new <code>Interview Project</code> and moved it into the internal Alpha testing phase. The new workflow aims to simplify the creation and sharing process for interviews (2025-07-24).",
          },
          {
            title: "🔧 Tweak: File Management",
            description:
              "Added a dedicated attachments table to manage user-uploaded files centrally, enabling file reuse and optimizing storage (2025-07-20).",
          },
        ],
      },
      {
        version: "v1.6.1",
        date: "2025-06-30",
        items: [
          {
            title: "🚀 Milestone: Atypica Global Launch",
            description:
              "Completed the core database migration from China to the US region, laying the foundation for global services (2025-06-29). Launched the new <code>new-study-interview</code> feature, clarifying user research goals through an initial AI conversation. Published the first global launch announcement on Twitter, officially marking the product's entry into the international market.",
          },
          {
            title:
              '🌱 Development: <a href="https://atypica.ai/newstudy" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Product R&D Flow</a>',
            description:
              "Completed the core development of the <code>Product R&D</code> research flow and moved it into the internal Alpha testing phase (2025-06-27).",
          },
          {
            title: "🎨 UI: All-New V3 Website",
            description:
              "Launched a completely redesigned official website (atypica.ai) with an improved information architecture and visual experience, featuring all AI-generated illustrations (2025-06-27).",
          },
        ],
      },
      {
        version: "v1.6.0",
        date: "2025-06-15",
        items: [
          {
            title: "💰 Commercialization: Pricing & Plan Upgrades",
            description:
              'Launched the <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"><code>MAX</code> subscription plan</a>, offering more tokens and advanced features (2025-06-12). Implemented plan upgrades/downgrades with automated pro-rated pricing based on remaining tokens (2025-06-26). Transitioned to USD-based pricing and integrated Stripe\'s Alipay auto-debit feature to streamline payments (2025-06-19).',
          },
          {
            title: "✨ Feature: Enhanced Research Capabilities",
            description:
              'Integrated <code>Tavily</code> for real-time web searches, providing richer context during the initial research phase. Added <code>Twitter</code> as a new data source for building more globally relevant user personas. Introduced the "Real Persona" concept, allowing personas based on actual interviews to be highlighted during research.',
          },
          {
            title: "🔧 Tweak: Research Flow Classification",
            description:
              "Implemented automatic classification of research queries (<code>Testing</code>, <code>Planning</code>, <code>Insights</code>, <code>Creation</code>) to match them with distinct research flows and report structures (2025-06-09).",
          },
        ],
      },
    ],
  },
  {
    title: "v1.5.x: Intelligent Reports & UX Leap",
    versions: [
      {
        version: "v1.5.1",
        date: "2025-05-31",
        items: [
          {
            title: "✨ Feature: In-Report Image Generation",
            description:
              "Integrated <code>Google Imagen 4.0</code> and <code>Midjourney</code> to dynamically generate high-quality, context-aware images directly within research reports (2025-05-25).",
          },
          {
            title: "🚀 Performance: Prompt Caching",
            description:
              "Enabled prompt caching for <code>Bedrock Claude</code>. By hashing historical messages, it reduces token consumption for repetitive requests by 90% (2025-05-29).",
          },
          {
            title: "🔧 Tweak: Voice Input",
            description:
              "Optimized the voice recognition feature using the <code>Groq Whisper</code> model for instant speech-to-text conversion, significantly improving interaction speed. Fixed a bug where prompt caching failed due to an issue in the Vercel AI SDK.",
          },
        ],
      },
      {
        version: "v1.5.0",
        date: "2025-05-20",
        items: [
          {
            title: "✨ Feature: Research Attachments",
            description:
              "Users can now upload documents (<code>PDF</code>, etc.) as context when initiating a study. The AI references this information during subsequent interviews and report generation (2025-05-18).",
          },
          {
            title: "✨ Feature: Persona Vector Search",
            description:
              "Integrated the <code>pgvector</code> extension into the database, adding <code>Embedding</code> vectors to Personas to enable semantic, similarity-based searches (2025-05-13).",
          },
          {
            title: "✨ Feature: Report Download (PDF)",
            description:
              "Deployed a standalone <code>html-to-pdf</code> service, allowing research reports to be downloaded as high-quality PDF files with a single click (2025-05-12).",
          },
          {
            title: "🔧 Tweak: Agent Interaction",
            description:
              "The <code>Study Agent</code> can now pass more specific instructions and context to the <code>Interview Agent</code>, receiving richer feedback and significantly reducing overall token consumption.",
          },
        ],
      },
    ],
  },
  {
    title: "v1.4.x: Platform Architecture Upgrade",
    versions: [
      {
        version: "v1.4.1",
        date: "2025-04-30",
        items: [
          {
            title: "🔧 Platform: Database Migration",
            description:
              "Successfully migrated the backend database from <code>MySQL</code> to <code>PostgreSQL</code>, paving the way for advanced features like vector search and complex queries (2025-04-29). Resolved initial performance issues post-migration by adding indexes to <code>nerd stats</code> queries.",
          },
          {
            title: "🔧 Tweak: Models & Cost",
            description:
              "Introduced the <code>gpt-4o</code> model with support for parallel tool calling to effectively reduce research costs (2025-04-16). Adopted <code>Google Gemini 1.5 Flash</code> for specific tasks to further optimize costs (2025-04-21). Implemented strict token and step limits to prevent research tasks from running over budget or time (2025-04-28).",
          },
        ],
      },
      {
        version: "v1.4.0",
        date: "2025-04-20",
        items: [
          {
            title: "💰 Commercialization: Tokens Billing Model Launch",
            description:
              'Switched the billing system from simple "points" to a more granular <code>Tokens</code>-based model. Officially launched the <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"><code>Pro</code> subscription plan</a> and a new <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"><code>Pricing</code> page</a> (2025-04-20). Integrated <code>Stripe</code> to support global credit card payments (2025-04-09).',
          },
          {
            title: "🔧 Platform: Core DB Rearchitecture",
            description:
              "Split <code>ChatMessage</code> data into a separate table, resolving data override issues during concurrent writes and improving system stability and scalability (2025-04-12).",
          },
          {
            title: "✨ Feature: Multi-platform Data Integration",
            description:
              "Added <code>TikTok</code> and <code>Instagram</code> as new data sources to broaden consumer insights (2025-04-17).",
          },
        ],
      },
    ],
  },
  {
    title: "v1.3.x: Conversational Research Assistant",
    versions: [
      {
        version: "v1.3.1",
        date: "2025-04-03",
        items: [
          {
            title: "💰 Commercialization: Payment MVP",
            description:
              'Introduced a user points system and launched the first payment feature ("buy a coffee") via the Heidian API. Added a <code>Hello Agent</code> to capture enterprise leads through conversation.',
          },
          {
            title: "✨ Feature: Invitation Codes",
            description: "Added an invitation code system for early user onboarding (2025-03-31).",
          },
        ],
      },
      {
        version: "v1.3.0",
        date: "2025-03-27",
        items: [
          {
            title: "✨ Core Rearchitecture: Unified Conversational UI",
            description:
              'Overhauled the multi-step process into a unified "research-driven chat" interface, where users can kick off a full study just by asking a question. Introduced the <code>Study Agent</code> as a "commander" to plan tasks, orchestrate specialized agents, and report back to the user.',
          },
          {
            title: "🎨 UX: New Interaction Paradigm",
            description:
              'Adopted a split-screen design (left: chat, right: <code>atypica llm console</code>) to provide real-time transparency into the AI\'s thought and execution process (2025-03-19). Implemented a "Replay" feature with shareable links (2025-03-22). Added "Nerd Stats" for tracking token and step consumption (2025-03-26). Added a <code>light/dark</code> theme toggle (2025-03-25). Generated the first <code>changelog</code> page automatically from <code>git log</code>.',
          },
        ],
      },
    ],
  },
  {
    title: "v1.2.x: Step-by-Step Research Process",
    versions: [
      {
        version: "v1.2.0",
        date: "2025-03-15",
        items: [
          {
            title: "✨ Core Rearchitecture: Guided Workflow",
            description:
              "Launched a multi-page, guided <code>scout → personas → analyst → interview → report</code> process, establishing a foundational framework for market research.",
          },
          {
            title: "✨ Features",
            subitems: [
              "<code>Analyst</code>: Create and manage research topics, stored in the database.",
              "<code>Interview</code>: Simulate AI-driven interviews with Personas.",
              "<code>Report</code>: Automatically generate HTML reports with a shareable link.",
            ],
          },
          {
            title: "🔧 Platform",
            description:
              "Introduced user authentication (login/signup) and made research history private (2025-03-16). First deployment to an <code>AWS</code> cluster at <code>atypica.musedam.cc</code>, with <code>GitHub CI</code> for continuous integration.",
          },
        ],
      },
    ],
  },
  {
    title: "v1.1.x: User Discovery Tool",
    versions: [
      {
        version: "v1.1.0",
        date: "2025-03-12",
        items: [
          {
            title: "🚀 Project Inception: ArchitypeAI -> Atypica",
            description:
              "Product concept defined: build interactive User Personas from social media data to test product innovation ideas (2025-03-05).",
          },
          {
            title: "✨ Core Feature: AI Persona Generation",
            description:
              'Achieved the first end-to-end flow: automatically summarizing and creating User Personas from "Xiaohongshu" data. The <code>SavePersona</code> tool successfully saved the first AI-generated persona to the database.',
          },
          {
            title: "🔧 Tech Stack",
            subitems: [
              "<code>Next.js</code> + <code>Vercel AI SDK</code> + <code>LLM Tools</code> as the core framework.",
              "<code>Claude 3.7 Sonnet</code> as the primary reasoning model.",
              "Significantly reduced early token costs by rewriting prompts with an <code>experimental</code> method (2025-03-08).",
            ],
          },
        ],
      },
    ],
  },
];

export const changelogFooterEN = "Log begins on March 5, 2025, project inception.";
