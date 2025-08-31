import React from "react";

export const AboutEN: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 font-mono">
          <span className="text-green-600 dark:text-green-400">atypica</span>.AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          AI-Powered Intelligence for Subjective Reality
        </p>
        <blockquote className="text-lg mt-6 border-l-4 border-green-600 dark:border-green-400 pl-6 italic">
          <p className="text-gray-700 dark:text-gray-300">
            &ldquo;People don&apos;t choose between things, they choose between descriptions of
            things.&rdquo;
            <span className="opacity-70 block text-sm mt-1">— Daniel Kahneman</span>
          </p>
        </blockquote>
      </header>

      <div className="space-y-16">
        {/* The Essence of Business Research */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            The Essence of Business Research
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-gray-800 dark:text-gray-200">
                Business research is the science of understanding human decision-making. Humans
                don&apos;t make decisions based purely on rationality, but are influenced by
                narratives, emotions, and cognitive biases. Therefore, understanding the mechanisms
                that influence decision-making is at the core of business research.
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                If &ldquo;physics&rdquo; models the &ldquo;objective world,&rdquo; then
                &ldquo;language models&rdquo; have the opportunity to model the &ldquo;subjective
                world.&rdquo; atypica.AI can capture human decision-making mechanisms that
                traditional data analysis handles poorly, providing deep insights for personal and
                business decision problems.
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-4 text-green-600 dark:text-green-400">
                Our Approach
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">→</span>
                  Simulate consumer personalities and cognition by building &ldquo;AI
                  Personas&rdquo;
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">→</span>
                  Analyze consumer behavior through &ldquo;interviews&rdquo; between
                  &ldquo;Interviewer AIs&rdquo; and &ldquo;AI Personas&rdquo;
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">→</span>
                  Automatically generate detailed research reports with visual insights
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Research Process */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            Research Process
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8">
            Using atypica.AI, you simply need to ask a specific business research question, and the
            system will provide a detailed research report through 10-20 minutes of &ldquo;long
            reasoning.&rdquo;
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { step: 1, title: "Clarify Problem" },
              { step: 2, title: "Design Tasks" },
              { step: 3, title: "Browse Social" },
              { step: 4, title: "Build Personas" },
              { step: 5, title: "Interview Sim" },
              { step: 6, title: "Summarize" },
              { step: 7, title: "Generate Report" },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                  {item.step}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.title}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              &ldquo;Nerd Stats&rdquo; records how much time, steps, AI Persona roles, and tokens
              were consumed during the work process, which is also a form of &ldquo;Proof of
              Work&rdquo; for the AI.
            </p>
          </div>
        </section>

        {/* Use Cases */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            Use Cases
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white mr-4">
                  T
                </div>
                <h3 className="text-xl font-semibold">Testing</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Evaluate marketing content topics and effectiveness, predict audience reactions
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Example:</strong> Which Logitech mouse topic would be more popular on social
                media?
              </p>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-4">
                  I
                </div>
                <h3 className="text-xl font-semibold">Insights</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Discover user experience pain points, understand customer feedback and experiences
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Example:</strong> Customer feedback analysis for luxury retail store
                experiences
              </p>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white mr-4">
                  C
                </div>
                <h3 className="text-xl font-semibold">Co-creation</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Co-create with simulated users to develop new products and services
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Example:</strong> Co-create new product ideas with young parents from
                first-tier cities
              </p>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-white mr-4">
                  P
                </div>
                <h3 className="text-xl font-semibold">Planning</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Develop marketing strategies and product roadmaps
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Example:</strong> Comprehensive marketing plan for new beverage products
              </p>
            </div>
          </div>

          <div className="mt-8 bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
              Personal Decision Support
            </h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Although atypica.AI is designed as a business research and analysis tool, it can also
              conduct personal decision research for everyday choices and life planning.
            </p>
          </div>
        </section>

        {/* Technical Origins & Development */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            Technical Origins & Development
          </h2>
          <div className="space-y-6">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                Origins of atypica.AI
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-gray-400 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2023
                    </span>
                    <h4 className="font-medium">Multi-Persona Interaction</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    The Stanford Town paper introduced us to the concept of multi-persona
                    interaction, but didn&apos;t truly demonstrate how these simulated personas
                    interact with each other.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2023.12
                    </span>
                    <h4 className="font-medium">Model Tool Calling</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    OpenAI&apos;s Function Calling and Claude&apos;s MCP protocol opened up new
                    possibilities for models to interact with the external world beyond chatbox
                    interactions.
                  </p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2024.11
                    </span>
                    <h4 className="font-medium">Language Models for Subjective World Modeling</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Stanford&apos;s breakthrough research successfully simulated 1,000 Americans
                    with 85%+ behavioral consistency, demonstrating the potential for AI personas to
                    model human behavior.
                  </p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2025.02
                    </span>
                    <h4 className="font-medium">Divergence-First Long Reasoning</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Unlike objective world reasoning that emphasizes &ldquo;convergence,&rdquo;
                    subjective world reasoning needs to emphasize &ldquo;divergence&rdquo; across
                    four dimensions: learning from cases, eureka moments, feedback quality, and
                    iteration count.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Limitations & Outlook */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            Technical Limitations & Outlook
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Limitations of atypica.AI
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">1.</span>
                  <div>
                    <strong>Input Question Quality:</strong> The accuracy of input questions largely
                    determines report quality
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">2.</span>
                  <div>
                    <strong>Model Accuracy Limitations:</strong> 80% accuracy in simulating complex
                    decision-making, with limitations in highly emotional or context-dependent
                    scenarios
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">3.</span>
                  <div>
                    <strong>Data Integration Complexity:</strong> Quality differences make
                    integration difficult, better at positive/negative feedback than biases and
                    limitations
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">4.</span>
                  <div>
                    <strong>Innovation Prediction Difficulty:</strong> Difficult to predict
                    responses to truly breakthrough innovations
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                Future Outlook
              </h3>
              <div className="mb-4">
                <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-700 dark:text-gray-300">
                  This method is equivalent to refining orange juice into concentrated powder, then
                  using language models as &ldquo;water&rdquo; to reconstitute it back into orange
                  juice.
                </blockquote>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                With the continuous development of language models and enhanced multimodal
                capabilities, atypica.AI will continue to improve in the following areas:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  More precise user profiling and behavior models
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  Deeper psychological model integration
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  More nuanced group difference modeling
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  More transparent AI reasoning and explanation systems
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* HippyGhosts */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            HippyGhosts Community
          </h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="md:w-1/3 flex justify-center">
                <div className="w-32 h-32 bg-green-600 rounded-lg flex items-center justify-center text-white text-4xl font-bold">
                  👻
                </div>
              </div>
              <div className="md:w-2/3">
                <h3 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">
                  HippyGhosts
                </h3>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  The visual identity of atypica.AI comes from the{" "}
                  <a
                    href="https://hippyghosts.io"
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    HippyGhosts.io
                  </a>{" "}
                  community, which represents the geek spirit of joyful hippy ghosts.
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  In the world of atypica.AI, the physical embodiment of each &ldquo;AI
                  Persona&rdquo; is a &ldquo;Hippy Ghost,&rdquo; representing the fusion of
                  technology and creativity, and symbolizing our pursuit of building AI personas
                  with personality and warmth.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-gray-500 dark:text-gray-400 pt-8 border-t border-gray-300 dark:border-gray-700">
          <div className="mb-4">
            <a
              href="/deck"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              View our pitch deck →
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
