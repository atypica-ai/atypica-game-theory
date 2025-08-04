import React from "react";

export const ChangelogEN: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Atypica.AI Changelog</h1>
      </header>

      <div className="space-y-16">
        {/* Future Updates */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            Future Updates Preview
          </h2>
          <div className="space-y-6 text-gray-800 dark:text-gray-200">
            <article>
              <ul className="space-y-4">
                <li>
                  <h4 className="font-semibold text-lg">🧪 Alpha Testing: New Interview Project</h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    A more streamlined and powerful <code>Interview Project</code> workflow is
                    currently in internal testing. It will support both AI-led and human-led
                    interview modes, aiming to significantly simplify the execution of user
                    research.
                  </p>
                </li>
                <li>
                  <h4 className="font-semibold text-lg">🧪 Alpha Testing: Product R&D Flow</h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    A new &quot;Product R&D&quot; research template is being tested internally. This
                    template focuses on market trends, user needs, and creative ideation, with a
                    report structure that emphasizes images and conceptual designs.
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v7.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">
            v7.x: Enterprise Collaboration & Data Insights
          </h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v7.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-08-08</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: Team Management
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Added team workspaces, supporting member invitations, removal, and role
                    management. Implemented user identity switching for seamless work between
                    personal and team spaces. Introduced dedicated routes and navigation menus for
                    the team edition.
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v7.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-08-01</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Core Feature: Build Private AI Personas (AI Persona Import) [Beta]
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Launched the core <code>AI Persona Import</code> feature, opening up a{" "}
                    <strong>public beta for Max plan users</strong>. Users can upload their own
                    interview transcripts (<code>PDF</code>, <code>JSON</code>, <code>CSV</code>) to
                    build completely private <code>Human Personas</code>. The AI provides
                    multi-dimensional analysis and scoring for the uploaded content, generating an
                    interactive <code>AI Persona</code> and visualizing the analysis with tools like
                    radar charts.
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v6.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v6.x: Globalization & Intelligent Enhancement</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v6.2.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-07-28</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 UX: Speech Recognition Upgrade
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Integrated <code>Groq Whisper</code> API for near real-time, streaming
                    transcription, dramatically improving the fluency of voice interviews
                    (2025-07-04).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🌱 Development: New Interview Project
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Completed the core development of the new <code>Interview Project</code> and
                    moved it into the internal Alpha testing phase. The new workflow aims to
                    simplify the creation and sharing process for interviews (2025-07-24).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Tweak: File Management
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Added a dedicated attachments table to manage user-uploaded files centrally,
                    enabling file reuse and optimizing storage (2025-07-20).
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v6.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-06-30</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 Milestone: Atypica Global Launch
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Completed the core database migration from China to the US region, laying the
                    foundation for global services (2025-06-29). Launched the new{" "}
                    <code>new-study-interview</code> feature, clarifying user research goals through
                    an initial AI conversation. Published the first global launch announcement on
                    Twitter, officially marking the product&apos;s entry into the international
                    market.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🌱 Development: Product R&D Flow
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Completed the core development of the <code>Product R&D</code> research flow and
                    moved it into the internal Alpha testing phase (2025-06-27).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎨 UI: All-New V3 Website
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Launched a completely redesigned official website (atypica.ai) with an improved
                    information architecture and visual experience, featuring all AI-generated
                    illustrations (2025-06-27).
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v6.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-06-15</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    💰 Commercialization: Pricing & Plan Upgrades
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Launched the <code>MAX</code> subscription plan, offering more tokens and
                    advanced features (2025-06-12). Implemented plan upgrades/downgrades with
                    automated pro-rated pricing based on remaining tokens (2025-06-26). Transitioned
                    to USD-based pricing and integrated Stripe&apos;s Alipay auto-debit feature to
                    streamline payments (2025-06-19).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: Enhanced Research Capabilities
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Integrated <code>Tavily</code> for real-time web searches, providing richer
                    context during the initial research phase. Added <code>Twitter</code> as a new
                    data source for building more globally relevant user personas. Introduced the
                    &quot;Real Persona&quot; concept, allowing personas based on actual interviews
                    to be highlighted during research.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Tweak: Research Flow Classification
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Implemented automatic classification of research queries (<code>Testing</code>,{" "}
                    <code>Planning</code>, <code>Insights</code>, <code>Creation</code>) to match
                    them with distinct research flows and report structures (2025-06-09).
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v5.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v5.x: Intelligent Reports & UX Leap</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v5.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-05-31</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: In-Report Image Generation
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Integrated <code>Google Imagen 4.0</code> and <code>Midjourney</code> to
                    dynamically generate high-quality, context-aware images directly within research
                    reports (2025-05-25).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 Performance: Prompt Caching
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Enabled prompt caching for <code>Bedrock Claude</code>. By hashing historical
                    messages, it reduces token consumption for repetitive requests by 90%
                    (2025-05-29).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Tweak: Voice Input
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Optimized the voice recognition feature using the <code>Groq Whisper</code>{" "}
                    model for instant speech-to-text conversion, significantly improving interaction
                    speed. Fixed a bug where prompt caching failed due to an issue in the Vercel AI
                    SDK.
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v5.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-05-20</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: Research Attachments
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Users can now upload documents (<code>PDF</code>, etc.) as context when
                    initiating a study. The AI references this information during subsequent
                    interviews and report generation (2025-05-18).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: Persona Vector Search
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Integrated the <code>pgvector</code> extension into the database, adding{" "}
                    <code>Embedding</code> vectors to Personas to enable semantic, similarity-based
                    searches (2025-05-13).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: Report Download (PDF)
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Deployed a standalone <code>html-to-pdf</code> service, allowing research
                    reports to be downloaded as high-quality PDF files with a single click
                    (2025-05-12).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Tweak: Agent Interaction
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    The <code>Study Agent</code> can now pass more specific instructions and context
                    to the <code>Interview Agent</code>, receiving richer feedback and significantly
                    reducing overall token consumption.
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v4.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v4.x: Platform Architecture Upgrade</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v4.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-04-30</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Platform: Database Migration
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Successfully migrated the backend database from <code>MySQL</code> to{" "}
                    <code>PostgreSQL</code>, paving the way for advanced features like vector search
                    and complex queries (2025-04-29). Resolved initial performance issues
                    post-migration by adding indexes to <code>nerd stats</code> queries.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Tweak: Models & Cost
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Introduced the <code>gpt-4o</code> model with support for parallel tool calling
                    to effectively reduce research costs (2025-04-16). Adopted{" "}
                    <code>Google Gemini 1.5 Flash</code> for specific tasks to further optimize
                    costs (2025-04-21). Implemented strict token and step limits to prevent research
                    tasks from running over budget or time (2025-04-28).
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v4.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-04-20</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    💰 Commercialization: Tokens Billing Model Launch
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Switched the billing system from simple &quot;points&quot; to a more granular{" "}
                    <code>Tokens</code>-based model. Officially launched the <code>Pro</code>{" "}
                    subscription plan and a new <code>Pricing</code> page (2025-04-20). Integrated{" "}
                    <code>Stripe</code> to support global credit card payments (2025-04-09).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Platform: Core DB Rearchitecture
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Split <code>ChatMessage</code> data into a separate table, resolving data
                    override issues during concurrent writes and improving system stability and
                    scalability (2025-04-12).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: Multi-platform Data Integration
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Added <code>TikTok</code> and <code>Instagram</code> as new data sources to
                    broaden consumer insights (2025-04-17).
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v3.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v3.x: Conversational Research Assistant</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v3.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-04-03</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    💰 Commercialization: Payment MVP
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Introduced a user points system and launched the first payment feature
                    (&quot;buy a coffee&quot;) via the Heidian API. Added a <code>Hello Agent</code>{" "}
                    to capture enterprise leads through conversation.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Feature: Invitation Codes
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Added an invitation code system for early user onboarding (2025-03-31).
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v3.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-03-27</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Core Rearchitecture: Unified Conversational UI
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Overhauled the multi-step process into a unified &quot;research-driven
                    chat&quot; interface, where users can kick off a full study just by asking a
                    question. Introduced the <code>Study Agent</code> as a &quot;commander&quot; to
                    plan tasks, orchestrate specialized agents, and report back to the user.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎨 UX: New Interaction Paradigm
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Adopted a split-screen design (left: chat, right:{" "}
                    <code>atypica llm console</code>) to provide real-time transparency into the
                    AI&apos;s thought and execution process (2025-03-19). Implemented a
                    &quot;Replay&quot; feature with shareable links (2025-03-22). Added &quot;Nerd
                    Stats&quot; for tracking token and step consumption (2025-03-26). Added a{" "}
                    <code>light/dark</code> theme toggle (2025-03-25). Generated the first{" "}
                    <code>changelog</code> page automatically from <code>git log</code>.
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v2.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v2.x: Step-by-Step Research Process</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v2.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-03-15</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Core Rearchitecture: Guided Workflow
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Launched a multi-page, guided{" "}
                    <code>scout → personas → analyst → interview → report</code> process,
                    establishing a foundational framework for market research.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Features
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    <code>Analyst</code>: Create and manage research topics, stored in the database.
                    <br />
                    <code>Interview</code>: Simulate AI-driven interviews with Personas.
                    <br />
                    <code>Report</code>: Automatically generate HTML reports with a shareable link.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Platform
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Introduced user authentication (login/signup) and made research history private
                    (2025-03-16).
                    <br />
                    First deployment to an <code>AWS</code> cluster at{" "}
                    <code>atypica.musedam.cc</code>, with <code>GitHub CI</code> for continuous
                    integration.
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v1.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v1.x: User Discovery Tool</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v1.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-03-12</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 Project Inception: ArchitypeAI -&gt; Atypica
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Product concept defined: build interactive User Personas from social media data
                    to test product innovation ideas (2025-03-05).
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ Core Feature: AI Persona Generation
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Achieved the first end-to-end flow: automatically summarizing and creating User
                    Personas from &quot;Xiaohongshu&quot; data. The <code>SavePersona</code> tool
                    successfully saved the first AI-generated persona to the database.
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 Tech Stack
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    <code>Next.js</code> + <code>Vercel AI SDK</code> + <code>LLM Tools</code> as
                    the core framework.
                    <br />
                    <code>Claude 3.7 Sonnet</code> as the primary reasoning model.
                    <br />
                    Significantly reduced early token costs by rewriting prompts with an{" "}
                    <code>experimental</code> method (2025-03-08).
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <footer className="text-center text-gray-500 dark:text-gray-400 pt-8 border-t border-gray-300 dark:border-gray-700">
          <p>Log begins on March 5, 2025, project inception.</p>
        </footer>
      </div>
    </div>
  );
};
