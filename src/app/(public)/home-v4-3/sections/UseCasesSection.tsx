"use client";

import { motion } from "framer-motion";
import styles from "../HomeV43.module.css";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, CUSTOMER_STORIES, USE_CASE_TABLE } from "../content";

const copy = CHAPTERS[5];

export default function UseCasesSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="light">
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#15b025] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500 mb-3">
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {copy.title}
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {/* Scenario table -- kept in CSS Module for nested selectors */}
          <table className={styles.useCaseTable}>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Core Tools</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              {USE_CASE_TABLE.map((row) => (
                <tr key={row.scenario}>
                  <td className="font-medium">{row.scenario}</td>
                  <td>{row.tools}</td>
                  <td>{row.agent}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Customer stories */}
          <p className="mt-12 font-IBMPlexMono text-xs tracking-[0.16em] uppercase text-zinc-500 mb-4">
            Customer Stories
          </p>
          <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
            {CUSTOMER_STORIES.map((story) => (
              <div key={story.key} className="border border-zinc-200 p-5">
                <div className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-[#15b025] mb-2.5">
                  {story.client}
                </div>
                <div className="mb-2">
                  <div className="font-IBMPlexMono text-[9px] tracking-[0.08em] uppercase text-zinc-500 mb-0.5">
                    Challenge
                  </div>
                  <div className="text-sm leading-normal text-zinc-800">{story.challenge}</div>
                </div>
                <div className="mb-2">
                  <div className="font-IBMPlexMono text-[9px] tracking-[0.08em] uppercase text-zinc-500 mb-0.5">
                    Solution
                  </div>
                  <div className="text-sm leading-normal text-zinc-800">{story.solution}</div>
                </div>
                <div className="mb-2">
                  <div className="font-IBMPlexMono text-[9px] tracking-[0.08em] uppercase text-zinc-500 mb-0.5">
                    Result
                  </div>
                  <div className="text-sm leading-normal text-zinc-800">{story.result}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
