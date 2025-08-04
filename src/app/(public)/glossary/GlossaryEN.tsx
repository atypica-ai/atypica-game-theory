import React from "react";

export const GlossaryEN: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2 font-mono tracking-tighter">
          [ Atypica.AI Glossary ]
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          A lexicon to synchronize communication protocols among all agents, human or otherwise.
        </p>
      </header>

      <div className="space-y-16">
        {/* Section 1: Core Concepts */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3 font-mono">
            &#123;/* 1. Core Concepts */&#125;
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700">
                    Term
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">AI Persona</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <strong>(Core Term)</strong> A virtual user simulated by AI, possessing specific
                    demographic traits, behavioral patterns, and psychological motivations. Serves
                    as the primary <strong>interviewee</strong> in the system.
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">Interviewer AI</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    The AI role responsible for{" "}
                    <strong>conducting interviews and asking questions</strong> within features like
                    &quot;Interview Projects&quot;.
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">Study Expert</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    In certain conversational scenarios, a role similar to `Interviewer AI`,
                    referring to the AI that leads research and interviews.
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">AI Persona Import</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    A core functional module for automatically analyzing and generating an `AI
                    Persona` by uploading files such as interview transcripts.
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">Interview Project</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    A research project that users can create and manage, where they can conduct
                    interviews with `AI Personas` or real users.
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">High-Precision AI Persona</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    An `AI Persona` with higher fidelity and behavioral consistency, professionally
                    constructed by the Atypica team (see Tier 2).
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 align-top">
                    <code className="font-semibold text-base">Human Persona</code>
                  </td>
                  <td className="px-4 py-3">
                    A private `AI Persona` generated by users through the `AI Persona Import`
                    feature, based on real interview data (see Tier 3).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: AI Persona Tiers */}
        <section>
          <h2 className="text-2xl font-bold mb-8 font-mono border-b border-gray-300 dark:border-gray-700 pb-3">
            &#123;/* 2. AI Persona Tiers */&#125;
          </h2>
          <p className="mb-8 text-gray-700 dark:text-gray-300">
            `AI Personas` are classified into tiers based on their data source, construction method,
            and precision. Higher tiers represent greater realism and complexity in behavioral
            simulation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 font-mono">Tier 0: Standard AI Persona</h3>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                Source: General Data
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                A standard AI persona generated from general data and algorithms. It meets basic
                research and interview needs, forming the foundation of the AI persona ecosystem.
              </p>
            </div>
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 font-mono">Tier 1: Synthetic AI Persona</h3>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                Source: Public Data Synthesis
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Synthesized from in-depth analysis and pattern extraction of public data. It has
                more defined behavioral patterns and characteristics than Tier 0, making it suitable
                for more specific market analysis.
              </p>
            </div>
            <div className="border border-teal-500/50 dark:border-teal-400/60 rounded-lg p-6 hover:shadow-lg transition-shadow bg-teal-50/20 dark:bg-teal-900/10">
              <h3 className="text-xl font-bold mb-2 font-mono text-teal-700 dark:text-teal-300">
                Tier 2: High-Precision AI Persona
              </h3>
              <p className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-4">
                Source: Professional Cognitive Modeling
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                High-quality, high-precision personas built by the Atypica team through deep
                interviews and expert modeling. They exhibit high consistency in cognitive patterns,
                emotional responses, and decision-making logic, enabling deep business research by
                simulating complex consumer behaviors.
              </p>
            </div>
            <div className="border border-indigo-500/50 dark:border-indigo-400/60 rounded-lg p-6 hover:shadow-lg transition-shadow bg-indigo-50/20 dark:bg-indigo-900/10">
              <h3 className="text-xl font-bold mb-2 font-mono text-indigo-700 dark:text-indigo-300">
                Tier 3: Human Persona
              </h3>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                Source: User-Uploaded Private Data
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Personas generated from real interview transcripts uploaded by users via `AI Persona
                Import`. Their key feature is <strong>privacy</strong>; they are built exclusively
                from user-provided data and are not searchable or usable by others, ensuring
                business data security. Fidelity depends directly on the quality of the uploaded
                data.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Agent Roles */}
        <section>
          <h2 className="text-2xl font-bold mb-8 font-mono border-b border-gray-300 dark:border-gray-700 pb-3">
            &#123;/* 3. Agent Role Distinction */&#125;
          </h2>
          <p className="mb-8 text-gray-700 dark:text-gray-300">
            To prevent ambiguity, &quot;Agent&quot; roles within the project must be strictly
            differentiated by function.
          </p>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 border-l-4 border-blue-500 pl-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg">
              <h3 className="text-xl font-semibold mb-3">Interviewee</h3>
              <p className="mb-4">
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  Standard Name:
                </span>
                <br />
                <code className="text-lg text-blue-700 dark:text-blue-400">AI Persona</code>
              </p>
              <p>
                <span className="font-semibold text-gray-600 dark:text-gray-400">Function:</span>
                <br />
                <span className="text-gray-800 dark:text-gray-200">
                  Serves as the subject of the interview, answers questions, and provides data and
                  insights.
                </span>
              </p>
            </div>

            <div className="flex-1 border-l-4 border-green-500 pl-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg">
              <h3 className="text-xl font-semibold mb-3">Interviewer</h3>
              <p className="mb-4">
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  Standard Name:
                </span>
                <br />
                <code className="text-lg text-green-700 dark:text-green-400">Interviewer AI</code>
              </p>
              <p>
                <span className="font-semibold text-gray-600 dark:text-gray-400">Function:</span>
                <br />
                <span className="text-gray-800 dark:text-gray-200">
                  Acts as the initiator and guide of the interview, asking questions and follow-ups
                  based on research objectives.
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
