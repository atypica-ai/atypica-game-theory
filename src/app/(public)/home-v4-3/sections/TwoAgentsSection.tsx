"use client";

import { motion } from "framer-motion";
import styles from "../HomeV43.module.css";
import { CHAPTERS, SIMULATOR, RESEARCHER } from "../content";

const copy = CHAPTERS[1];

/* ─── Minimal UI Mockups (CSS only) ─── */

function PersonaMockup() {
  return (
    <div className={styles.mockupPersona}>
      <div
        className={styles.mockupPersonaAvatar}
        style={{ borderColor: "rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)" }}
      />
      <div className={styles.mockupLines}>
        <div className={styles.mockupLine} style={{ width: "50%", margin: "0 auto" }} />
        <div className={styles.mockupLine} style={{ width: "35%", margin: "0 auto" }} />
      </div>
      <div className={styles.mockupPersonaTags}>
        {["Gen-Z", "Urban", "Price-sensitive", "Social"].map((tag) => (
          <span
            key={tag}
            className={styles.mockupPersonaTag}
            style={{ borderColor: "rgba(74,222,128,0.2)", color: "rgba(74,222,128,0.6)" }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function InterviewMockup() {
  return (
    <div className={styles.mockupInterview}>
      <div className={`${styles.mockupBubble} ${styles.mockupBubbleAi}`}>
        <div className={styles.mockupLine} style={{ width: "85%" }} />
        <div className={styles.mockupLine} style={{ width: "60%", marginTop: 3 }} />
      </div>
      <div className={`${styles.mockupBubble} ${styles.mockupBubbleUser}`}>
        <div className={styles.mockupLine} style={{ width: "70%", background: "rgba(255,255,255,0.1)" }} />
      </div>
      <div className={`${styles.mockupBubble} ${styles.mockupBubbleAi}`}>
        <div className={styles.mockupLine} style={{ width: "90%" }} />
        <div className={styles.mockupLine} style={{ width: "75%", marginTop: 3 }} />
        <div className={styles.mockupLine} style={{ width: "40%", marginTop: 3 }} />
      </div>
      <div className={`${styles.mockupBubble} ${styles.mockupBubbleUser}`}>
        <div className={styles.mockupLine} style={{ width: "55%", background: "rgba(255,255,255,0.1)" }} />
        <div className={styles.mockupLine} style={{ width: "80%", marginTop: 3, background: "rgba(255,255,255,0.1)" }} />
      </div>
    </div>
  );
}

export default function TwoAgentsSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section ref={register} id={copy.id} className={styles.chapter}>
      <div className={styles.chapterHeader}>
        <div className={styles.chapterNumber}>{copy.number}</div>
        <p className={styles.chapterKicker}>{copy.kicker}</p>
        <h2 className={styles.chapterTitle}>{copy.title}</h2>
        {copy.body.map((text) => (
          <p key={text} className={styles.chapterBody}>{text}</p>
        ))}
      </div>

      <motion.div
        className={styles.chapterContent}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.agentsGrid}>
          {/* Simulator card */}
          <div className={styles.agentCard}>
            <div className={styles.agentTag} style={{ color: "#4ade80" }}>
              {SIMULATOR.tag}
            </div>
            <h3 className={styles.agentTitle}>{SIMULATOR.title}</h3>
            <p className={styles.agentDesc}>{SIMULATOR.description}</p>

            {/* Persona mockup */}
            <div style={{ marginBottom: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <PersonaMockup />
            </div>

            <div className={styles.agentRoles}>
              {SIMULATOR.roles.map((role) => (
                <div key={role.key} className={styles.agentRole}>
                  <div className={styles.agentRoleLabel}>{role.label}</div>
                  <div className={styles.agentRoleSub}>{role.sub}</div>
                  <div className={styles.agentRoleDesc}>{role.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Researcher card */}
          <div className={styles.agentCard}>
            <div className={styles.agentTag} style={{ color: "#93c5fd" }}>
              {RESEARCHER.tag}
            </div>
            <h3 className={styles.agentTitle}>{RESEARCHER.title}</h3>
            <p className={styles.agentDesc}>{RESEARCHER.description}</p>

            {/* Interview mockup */}
            <div style={{ marginBottom: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <InterviewMockup />
            </div>

            <div className={styles.methodsList}>
              {RESEARCHER.methods.map((method, i) => (
                <div key={method.key} className={styles.methodItem}>
                  <span className={styles.methodIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <span>{method.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
