# atypica.AI Changelog

---

## v2.3.x: Intelligent Memory & Intent Understanding

### `v2.3.0` — _2026-01-08_

- **🧠 Major Feature: User Memory System**
  - Established persistent memory system where AI automatically remembers user preferences, habits, and contextual information for personalized service.
  - Two-layer memory architecture (Core Memory + Working Memory) with intelligent reorganization and compression.
  - New user capabilities page (/account/capabilities) to view and edit personal memory anytime.
  - Supports both user-level and team-level memory management.
  - As conversations grow, AI understanding deepens without requiring repeated explanations.
- **🎯 Major Feature: Intelligent Research Planning (Plan Mode)**
  - Brand new research initiation experience: AI automatically understands your needs and determines the most suitable research type.
  - Displays complete research plan, confirm with one click to start, no repeated back-and-forth needed.
  - Added AI-generated research scenario shortcuts tailored to your role to inspire research direction.
  - All research types now support advanced features like referencing existing research, uploading files, and MCP tool integration.
  - Upgraded to Claude Sonnet 4.5 model for more accurate understanding and faster response.
- **🎨 Design & Experience Optimization**
  - Added design philosophy documentation: "The Less AI, The More AI" core principle.
  - Optimized report and podcast generation prompts to emphasize research findings over methodology.
  - Cover generation shifted from fixed style to dynamic selection.
  - Instagram migrated to v2 API, notification system migrated to Intercom event tracking.

---

## v2.2.x: Group Research & Discussion Mode

### `v2.2.0` — _2025-12-27_

- **💬 Major Feature: discussionChat Discussion Mode**
  - Added discussionChat as alternative to interviewChat, supporting group discussion scenarios.
  - discussionChat for viewpoint collision and solution testing (3-8 participants).
  - interviewChat for deep personal insights (5-10 participants).
  - AI automatically selects the most appropriate research method during planning phase based on objectives.
  - Completed studyLog architecture migration from database fields to message-driven architecture.
  - All research content flows through messages for unified flexibility.

---

## v11.x: AI Research Platform & Developer Tools

### `v11.3.0` — _2025-12-11_

- **🚀 Major Feature: Fast Insight**
  - Brand new fast research mode focused on rapidly generating high-quality podcast content.
  - Five-stage automated workflow: Topic Understanding → Podcast Planning → Deep Research → Podcast Generation → Completion.
  - Dual-model collaboration using Claude 3.7 Sonnet and Gemini 2.5 Pro.
  - Intelligent podcast content strategy and search strategy planning, automatically generates opinion-oriented podcast scripts and audio.
- **📽️ UX Improvements: Enhanced Replay Feature**
  - Added cinematic intro animation effects and progress bar to display research progress.
  - Supports quick jump to report functionality, optimized visual hierarchy and console display.
- **⚡ Technical Optimizations**
  - Database performance optimization (foreign key indexes, N+1 query fixes, Token deadlock resolution).
  - System enhancements (interview project import/export, mobile menu, security updates, etc.).
  - Code refactoring and cleanup for improved system stability and maintainability.

### `v11.2.0` — _2025-12-05_

- **🔬 Core Feature: Deep Research MCP Service**
  - Implemented Deep Research functionality as an MCP (Model Context Protocol) service.
  - Supports multiple research experts: Grok Expert, Trend Explorer, and more.
  - Integrated Perplexity Sonar Pro for high-quality web searches.
  - Provides standard MCP API interface for third-party integration with streaming output support.
- **🔑 Developer Feature: API Key Management**
  - Users can create and manage personal API Keys.
  - Teams support multi-member API Key management with permission validation and ownership control.
  - Deep Research MCP endpoint supports API Key authentication.
- **🎨 Content Enhancement: AI-Generated Cover Images**
  - Reports and podcasts support AI auto-generated cover images (integrated Gemini 2.5 Flash Image model).
  - Supports custom aspect ratio and layout controls, podcast RSS supports platform-specific cover ratios.

### `v11.1.0` — _2025-12-03_

- **🎯 Full Launch: Product R&D Flow**
  - New "Product R&D" research template focusing on market trends, user needs, and creative ideation.
  - Optimized research workflow and report structure for product innovation scenarios.
  - Helps teams quickly validate product ideas and market opportunities.

### `v11.0.0` — _2025-11-21_

- **💎 New Plans: Unlimited Subscriptions**
  - Launched Super (personal) and SuperTeam (team) unlimited token plans.
  - Unlimited token usage for high-intensity research needs.
  - Flexible team member management and subscription controls.
- **🏢 Enterprise Features Upgrade**
  - Comprehensive Pricing page overhaul with enterprise feature showcase.
  - Enterprise-exclusive features: custom development, dedicated customer success, API access, etc.
  - Optimized enterprise lead collection with enhanced information gathering.
- **🔒 SOC 2 Certification**
  - Platform achieved SOC 2 security compliance certification.
  - Certification badges displayed across website, pricing, and enterprise pages.
  - Enhanced enterprise-grade security and compliance assurance.
- **🤝 Launch: Affiliate Program**
  - Officially launched friends.atypica.ai affiliate platform.
  - Integrated Tolt tracking system for referral links and commission management.
  - Automatic tracking of referral sources for user signups and payments.

---

## v10.x: Multimodal Research & Content Generation

### `v10.1.0` — _2025-10-25_

- **🎧 Full Launch: Study-to-Podcast Generation**
  - Research reports can now be converted into podcast audio with one click, supporting online listening and downloading.
  - Multiple podcast styles available: deep dive analysis, opinion discussion, and debate format.
  - Intelligent script generation with automatic host dialogue configuration.
  - Email notifications sent when podcast generation is complete.
  - Full functionality available to Pro, Max, and Team plan subscribers.

### `v10.0.0` — _2025-10-15_

- **🎤 Major Upgrade: Interview System Enhancements**
  - Added multiple-choice question support for richer interview formats.
  - Interview reports can be generated, shared, and downloaded as PDF.
  - Share interview projects via invite links with configurable expiration.
  - Set preferred form of address for interviewees.
  - Multi-language interview support (Chinese and English).
  - File attachment support in interview conversations.
- **🧑‍💼 Enhanced: Persona System**
  - Personas can now be shared via public access links.
  - Persona chat supports file uploads as conversation context.
  - Improved search and filtering with tag and preview features.
- **✨ Improved: Research Workflow**
  - New AI-powered recommendations for research next steps.
  - Continue deeper exploration based on existing research with reference context.
  - Unified management interface for reports and podcasts for easier access and sharing.
- **🚀 Performance & Stability**
  - AI engine upgraded for improved response speed and stability.
  - Enhanced multi-model support optimizing cost and performance balance.
  - System architecture optimizations for better overall user experience.

---

## v9.x: Guided Research Strategy & Transparency

### `v9.0.0` — _2025-09-15_

- **🗺️ Guided Planning Before AI Research Starts**
  - Previously, AI research jumped straight into interviews and search. Now every study begins with a visible plan that explains what will be asked, who will be researched, and why those steps matter.
- **🧠 AI Research Strategy Templates**
  - The planning step now selects the right business analysis frameworks (JTBD, STP, GE matrix, etc.) for each question, helping teams understand the strategic lens behind the upcoming interviews and desk research.
- **📝 Pre-Report Research Log**
  - Before the final report is generated, the AI prepares a detailed research log that summarizes information gathered and decisions made, so teams get the context behind the conclusions instead of just the finished deliverable.

---

## v8.x: AI Interview & AI Persona Full Launch

### `v8.0.0` — _2025-09-04_

- **🚀 Full Launch: Interview Project & AI Persona Import**
  - Both features now available to all plans (removed preview/beta status)
  - Free/Pro plans: Access to limited features
  - Max/Team plans: Access to full functionality
- **✨ Major Feature: AI Interview Question Optimization**
  - AI automatically analyzes your interview project brief and optimizes questions for better research outcomes
  - Transforms complex questions into clear, answerable segments following research best practices
  - Applies fact-first methodology: prioritizes concrete behaviors over abstract opinions
  - Generates more granular questions to capture deeper insights and authentic responses
  - Works seamlessly with both human interviews and AI persona interviews
  - Real-time processing with background optimization and live status updates
- **🎨 UX Improvements**
  - Enhanced voice input speed and responsiveness
  - Redesigned persona import workflow with better status visibility

---

## v7.x: Enterprise Collaboration & Data Insights

### `v7.1.0` — _2025-08-08_

- **✨ Feature: Team Management**
  - Added team workspaces, supporting member invitations, removal, and role management.
  - Implemented user identity switching for seamless work between personal and team spaces.
  - Introduced dedicated routes and navigation menus for the team edition.

### `v7.0.0` — _2025-08-01_

- **✨ Core Feature: Build Private AI Personas (AI Persona Import) [Beta]**
  - Launched the core `AI Persona Import` feature, opening up a **public beta for Max plan users**.
  - Users can upload their own interview transcripts (`PDF`, `JSON`, `CSV`) to build completely private `Human AI Personas`.
  - The AI provides multi-dimensional analysis and scoring for the uploaded content, generating an interactive `AI Persona` and visualizing the analysis with tools like radar charts.

---

## v6.x: Globalization & Intelligent Enhancement

### `v6.2.0` — _2025-07-28_

- **🚀 UX: Speech Recognition Upgrade**
  - Integrated `Groq Whisper` API for near real-time, streaming transcription, dramatically improving the fluency of voice interviews (2025-07-04).
- **🌱 Development: New Interview Project**
  - Completed the core development of the new `Interview Project` and moved it into the internal Alpha testing phase. The new workflow aims to simplify the creation and sharing process for interviews (2025-07-24).
- **🔧 Tweak: File Management**
  - Added a dedicated attachments table to manage user-uploaded files centrally, enabling file reuse and optimizing storage (2025-07-20).

### `v6.1.0` — _2025-06-30_

- **🚀 Milestone: Atypica Global Launch**
  - Completed the core database migration from China to the US region, laying the foundation for global services (2025-06-29).
  - Launched the new `new-study-interview` feature, clarifying user research goals through an initial AI conversation.
  - Published the first global launch announcement on Twitter, officially marking the product's entry into the international market.
- **🌱 Development: Product R&D Flow**
  - Completed the core development of the `Product R&D` research flow and moved it into the internal Alpha testing phase (2025-06-27).
- **🎨 UI: All-New V3 Website**
  - Launched a completely redesigned official website (atypica.ai) with an improved information architecture and visual experience, featuring all AI-generated illustrations (2025-06-27).

### `v6.0.0` — _2025-06-15_

- **💰 Commercialization: Pricing & Plan Upgrades**
  - Launched the `MAX` subscription plan, offering more tokens and advanced features (2025-06-12).
  - Implemented plan upgrades/downgrades with automated pro-rated pricing based on remaining tokens (2025-06-26).
  - Transitioned to USD-based pricing and integrated Stripe's Alipay auto-debit feature to streamline payments (2025-06-19).
- **✨ Feature: Enhanced Research Capabilities**
  - Integrated `Tavily` for real-time web searches, providing richer context during the initial research phase.
  - Added `Twitter` as a new data source for building more globally relevant user personas.
  - Introduced the "Real Persona" concept, allowing personas based on actual interviews to be highlighted during research.
- **🔧 Tweak: Research Flow Classification**
  - Implemented automatic classification of research queries (`Testing`, `Planning`, `Insights`, `Creation`) to match them with distinct research flows and report structures (2025-06-09).

---

## v5.x: Intelligent Reports & UX Leap

### `v5.1.0` — _2025-05-31_

- **✨ Feature: In-Report Image Generation**
  - Integrated `Google Imagen 4.0` and `Midjourney` to dynamically generate high-quality, context-aware images directly within research reports (2025-05-25).
- **🚀 Performance: Prompt Caching**
  - Enabled prompt caching for `Bedrock Claude`. By hashing historical messages, it reduces token consumption for repetitive requests by 90% (2025-05-29).
- **🔧 Tweak: Voice Input**
  - Optimized the voice recognition feature using the `Groq Whisper` model for instant speech-to-text conversion, significantly improving interaction speed.
  - Fixed a bug where prompt caching failed due to an issue in the Vercel AI SDK.

### `v5.0.0` — _2025-05-20_

- **✨ Feature: Research Attachments**
  - Users can now upload documents (`PDF`, etc.) as context when initiating a study. The AI references this information during subsequent interviews and report generation (2025-05-18).
- **✨ Feature: Persona Vector Search**
  - Integrated the `pgvector` extension into the database, adding `Embedding` vectors to Personas to enable semantic, similarity-based searches (2025-05-13).
- **✨ Feature: Report Download (PDF)**
  - Deployed a standalone `html-to-pdf` service, allowing research reports to be downloaded as high-quality PDF files with a single click (2025-05-12).
- **🔧 Tweak: Agent Interaction**
  - The `Study Agent` can now pass more specific instructions and context to the `Interview Agent`, receiving richer feedback and significantly reducing overall token consumption.

---

## v4.x: Platform Architecture Upgrade

### `v4.1.0` — _2025-04-30_

- **🔧 Platform: Database Migration**
  - Successfully migrated the backend database from `MySQL` to `PostgreSQL`, paving the way for advanced features like vector search and complex queries (2025-04-29).
  - Resolved initial performance issues post-migration by adding indexes to `nerd stats` queries.
- **🔧 Tweak: Models & Cost**
  - Introduced the `gpt-4o` model with support for parallel tool calling to effectively reduce research costs (2025-04-16).
  - Adopted `Google Gemini 1.5 Flash` for specific tasks to further optimize costs (2025-04-21).
  - Implemented strict token and step limits to prevent research tasks from running over budget or time (2025-04-28).

### `v4.0.0` — _2025-04-20_

- **💰 Commercialization: Tokens Billing Model Launch**
  - Switched the billing system from simple "points" to a more granular `Tokens`-based model.
  - Officially launched the `Pro` subscription plan and a new `Pricing` page (2025-04-20).
  - Integrated `Stripe` to support global credit card payments (2025-04-09).
- **🔧 Platform: Core DB Rearchitecture**
  - Split `ChatMessage` data into a separate table, resolving data override issues during concurrent writes and improving system stability and scalability (2025-04-12).
- **✨ Feature: Multi-platform Data Integration**
  - Added `TikTok` and `Instagram` as new data sources to broaden consumer insights (2025-04-17).

---

## v3.x: Conversational Research Assistant

### `v3.1.0` — _2025-04-03_

- **💰 Commercialization: Payment MVP**
  - Introduced a user points system and launched the first payment feature ("buy a coffee") via the Heidian API.
  - Added a `Hello Agent` to capture enterprise leads through conversation.
- **✨ Feature: Invitation Codes**
  - Added an invitation code system for early user onboarding (2025-03-31).

### `v3.0.0` — _2025-03-27_

- **✨ Core Rearchitecture: Unified Conversational UI**
  - Overhauled the multi-step process into a unified "research-driven chat" interface, where users can kick off a full study just by asking a question.
  - Introduced the `Study Agent` as a "commander" to plan tasks, orchestrate specialized agents, and report back to the user.
- **🎨 UX: New Interaction Paradigm**
  - Adopted a split-screen design (left: chat, right: `atypica llm console`) to provide real-time transparency into the AI's thought and execution process (2025-03-19).
  - Implemented a "Replay" feature with shareable links (2025-03-22).
  - Added "Nerd Stats" for tracking token and step consumption (2025-03-26).
  - Added a `light/dark` theme toggle (2025-03-25).
  - Generated the first `changelog` page automatically from `git log`.

---

## v2.x: Step-by-Step Research Process

### `v2.0.0` — _2025-03-15_

- **✨ Core Rearchitecture: Guided Workflow**
  - Launched a multi-page, guided `scout → personas → analyst → interview → report` process, establishing a foundational framework for market research.
- **✨ Features:**
  - `Analyst`: Create and manage research topics, stored in the database.
  - `Interview`: Simulate AI-driven interviews with Personas.
  - `Report`: Automatically generate HTML reports with a shareable link.
- **🔧 Platform:**
  - Introduced user authentication (login/signup) and made research history private (2025-03-16).
  - First deployment to an `AWS` cluster at `atypica.musedam.cc`, with `GitHub CI` for continuous integration.

---

## v1.x: User Discovery Tool

### `v1.0.0` — _2025-03-12_

- **🚀 Project Inception: ArchitypeAI -> Atypica**
  - Product concept defined: build interactive User Personas from social media data to test product innovation ideas (2025-03-05).
- **✨ Core Feature: AI Persona Generation**
  - Achieved the first end-to-end flow: automatically summarizing and creating User Personas from "Xiaohongshu" data.
  - The `SavePersona` tool successfully saved the first AI-generated persona to the database.
- **🔧 Tech Stack:**
  - `Next.js` + `Vercel AI SDK` + `LLM Tools` as the core framework.
  - `Claude 3.7 Sonnet` as the primary reasoning model.
  - Significantly reduced early token costs by rewriting prompts with an `experimental` method (2025-03-08).

---

_Log begins on March 5, 2025, project inception._
