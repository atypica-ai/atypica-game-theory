"use client";

import { motion } from "framer-motion";
import styles from "../HomeV43.module.css";
import { CHAPTERS, DATA_ASSETS } from "../content";

const copy = CHAPTERS[4];

/* ─── CSS-only Mockups for each asset ─── */

function PersonaAssetMockup() {
  return (
    <div className={styles.mockupPersona} style={{ height: "100%" }}>
      <div
        className={styles.mockupPersonaAvatar}
        style={{
          width: 36,
          height: 36,
          borderColor: "rgba(27,255,27,0.3)",
          background: "rgba(27,255,27,0.06)",
        }}
      />
      <div className={styles.mockupLines} style={{ alignItems: "center" }}>
        <div className={styles.mockupLine} style={{ width: "45%", background: "rgba(0,0,0,0.08)" }} />
        <div className={styles.mockupLine} style={{ width: "30%", background: "rgba(0,0,0,0.05)" }} />
      </div>
      <div className={styles.mockupPersonaTags}>
        {["Tier-2", "Female", "25-34", "Urban"].map((tag) => (
          <span
            key={tag}
            className={styles.mockupPersonaTag}
            style={{ borderColor: "rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.4)", fontSize: 7 }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SageAssetMockup() {
  return (
    <div className={styles.mockupSage} style={{ height: "100%" }}>
      <div className={styles.mockupKnowledgeLayer} style={{ borderColor: "rgba(0,0,0,0.08)", background: "rgba(147,197,253,0.04)" }}>
        <div className={styles.mockupKnowledgeLabel} style={{ color: "rgba(0,0,0,0.3)" }}>
          CORE MEMORY
        </div>
        <div className={styles.mockupLine} style={{ width: "80%", background: "rgba(0,0,0,0.06)" }} />
        <div className={styles.mockupLine} style={{ width: "60%", background: "rgba(0,0,0,0.04)", marginTop: 3 }} />
      </div>
      <div className={styles.mockupKnowledgeLayer} style={{ borderColor: "rgba(0,0,0,0.06)", background: "rgba(147,197,253,0.02)" }}>
        <div className={styles.mockupKnowledgeLabel} style={{ color: "rgba(0,0,0,0.25)" }}>
          WORKING MEMORY
        </div>
        <div className={styles.mockupLine} style={{ width: "70%", background: "rgba(0,0,0,0.05)" }} />
        <div className={styles.mockupLine} style={{ width: "45%", background: "rgba(0,0,0,0.03)", marginTop: 3 }} />
      </div>
    </div>
  );
}

function PanelAssetMockup() {
  const colors = ["#1bff1b", "#93c5fd", "#f59e0b", "#f472b6"];
  return (
    <div className={styles.mockupPanel} style={{ height: "100%" }}>
      {["Moderator", "Persona A", "Persona B", "Persona C"].map((name, i) => (
        <div key={name} style={{ display: "contents" }}>
          <div className={styles.mockupParticipant}>
            <span className={styles.mockupParticipantDot} style={{ backgroundColor: colors[i], opacity: 0.5 }} />
            <span className={styles.mockupParticipantName} style={{ color: "rgba(0,0,0,0.35)" }}>{name}</span>
          </div>
          <div className={styles.mockupMessage} style={{ borderColor: "rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.02)" }}>
            <div className={styles.mockupLine} style={{ width: `${55 + i * 10}%`, background: "rgba(0,0,0,0.06)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const ASSET_MOCKUPS = [PersonaAssetMockup, SageAssetMockup, PanelAssetMockup];

export default function DataAssetsSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section ref={register} id={copy.id} className={`${styles.chapter} ${styles.chapterLight}`}>
      <div className={styles.chapterLightInner}>
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
        <div className={styles.assetsGrid}>
          {DATA_ASSETS.map((asset, i) => {
            const Mockup = ASSET_MOCKUPS[i];
            return (
              <div key={asset.key} className={styles.assetCard}>
                <div className={styles.assetMockup}>
                  <Mockup />
                </div>
                <div className={styles.assetInfo}>
                  <h3 className={styles.assetTitle}>{asset.title}</h3>
                  <p className={styles.assetDesc}>{asset.description}</p>
                  <div className={styles.assetStats}>
                    {asset.stats.map((stat) => (
                      <div key={stat.label} className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>{stat.label}</div>
                        <div className={styles.assetStatValue}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
      </div>
    </section>
  );
}
