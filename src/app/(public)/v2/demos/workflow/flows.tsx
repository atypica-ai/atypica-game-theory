"use client";

import { useTranslations } from "next-intl";
import React from "react";
import DiscussionScreen from "./DiscussionScreen";
import FeedbackScreen from "./FeedbackScreen";
import InterviewScreen from "./InterviewScreen";
import ReportScreen from "./ReportScreen";
import ResearchPlanScreen from "./ResearchPlanScreen";
import ScoutScreen from "./ScoutScreen";
import SelectScreen from "./SelectScreen";
import SignalScreen from "./SignalScreen";
import StudyChatScreen from "./StudyChatScreen";
import StudyInputScreen from "./StudyInputScreen";

export type FlowStep = {
  breadcrumb: [string, string];
  sidebarActive: number;
  duration: number;
  render: () => React.ReactNode;
};

export type FlowDef = {
  steps: FlowStep[];
};

/* ═══════════════════════════════════════════════
   Named step components — resolve i18n with LITERAL keys
   and pass structured data as typed props.
   No dynamic key construction (no template literals with indexes).
   ═══════════════════════════════════════════════ */

// ── Consumer Insight steps ──
function ConsumerInsightInput() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <StudyInputScreen
      question={t("workflow.demos.consumerInsight.question")}
      refStudy={t("workflow.demos.consumerInsight.refStudy")}
    />
  );
}
function ConsumerInsightPlan() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ResearchPlanScreen
      planTitle={t("workflow.demos.consumerInsight.planTitle")}
      steps={[
        t("workflow.demos.consumerInsight.planStep1"),
        t("workflow.demos.consumerInsight.planStep2"),
        t("workflow.demos.consumerInsight.planStep3"),
        t("workflow.demos.consumerInsight.planStep4"),
        t("workflow.demos.consumerInsight.planStep5"),
      ]}
    />
  );
}
function ConsumerInsightScout() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ScoutScreen
      postLabels={[
        t("workflow.demos.consumerInsight.scoutPost1"),
        t("workflow.demos.consumerInsight.scoutPost2"),
        t("workflow.demos.consumerInsight.scoutPost3"),
      ]}
    />
  );
}
function ConsumerInsightReport() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ReportScreen
      variant="insight"
      title={t("workflow.demos.consumerInsight.reportTitle")}
      finding={t("workflow.demos.consumerInsight.reportFinding")}
      stats={[
        {
          label: t("workflow.demos.consumerInsight.stat1Label"),
          value: t("workflow.demos.consumerInsight.stat1Value"),
        },
        {
          label: t("workflow.demos.consumerInsight.stat2Label"),
          value: t("workflow.demos.consumerInsight.stat2Value"),
        },
        {
          label: t("workflow.demos.consumerInsight.stat3Label"),
          value: t("workflow.demos.consumerInsight.stat3Value"),
        },
      ]}
    />
  );
}

// ── Concept Testing steps ──
function ConceptTestingDiscussion() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <DiscussionScreen
      personas={[
        { seed: 2847, name: "#2847" },
        { seed: 1105, name: "#1105" },
        { seed: 3021, name: "#3021" },
        { seed: 891, name: "#891" },
        { seed: 1523, name: "#1523" },
        { seed: 604, name: "#604" },
      ]}
      events={[
        { type: "moderator", text: t("workflow.demos.conceptTesting.discQ") },
        {
          type: "persona",
          seed: 1105,
          name: "#1105",
          text: t("workflow.demos.conceptTesting.discReply1"),
        },
        {
          type: "persona",
          seed: 3021,
          name: "#3021",
          text: t("workflow.demos.conceptTesting.discReply2"),
        },
        { type: "summary", text: t("workflow.demos.conceptTesting.discSummary") },
      ]}
    />
  );
}
function ConceptTestingChat() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <StudyChatScreen
      userMsg={t("workflow.demos.conceptTesting.chatUserMsg")}
      aiReply={t("workflow.demos.conceptTesting.chatAiReply")}
      tools={[
        { name: "discussionChat", status: "done", result: "6 personas" },
        { name: "scoring", status: "done", result: "67% approval" },
        { name: "generateReport", status: "running" },
      ]}
    />
  );
}
function ConceptTestingReport() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ReportScreen
      variant="verdict"
      title={t("workflow.demos.conceptTesting.reportTitle")}
      finding={t("workflow.demos.conceptTesting.reportFinding")}
      stats={[
        {
          label: t("workflow.demos.conceptTesting.stat1Label"),
          value: t("workflow.demos.conceptTesting.stat1Value"),
        },
        {
          label: t("workflow.demos.conceptTesting.stat2Label"),
          value: t("workflow.demos.conceptTesting.stat2Value"),
        },
        {
          label: t("workflow.demos.conceptTesting.stat3Label"),
          value: t("workflow.demos.conceptTesting.stat3Value"),
        },
      ]}
    />
  );
}

// ── Product R&D steps (Scout → Inspiration+Validate → Report) ──
function ProductRnDScout() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ScoutScreen
      postLabels={[
        t("workflow.demos.productRnD.scoutPost1"),
        t("workflow.demos.productRnD.scoutPost2"),
        t("workflow.demos.productRnD.scoutPost3"),
      ]}
    />
  );
}
function ProductRnDInspiration() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <StudyChatScreen
      userMsg={t("workflow.demos.productRnD.inspirationUserMsg")}
      aiReply={t("workflow.demos.productRnD.inspirationAiReply")}
      tools={[
        { name: "scoutTrends", status: "done", result: "3 platforms" },
        { name: "audienceCall", status: "done", result: "validated" },
        { name: "scoutTrends", status: "done", result: "uniqueness ✓" },
        { name: "generateReport", status: "running" },
      ]}
    />
  );
}
function ProductRnDReport() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ReportScreen
      variant="concept"
      title={t("workflow.demos.productRnD.reportTitle")}
      finding={t("workflow.demos.productRnD.reportFinding")}
      stats={[
        {
          label: t("workflow.demos.productRnD.stat1Label"),
          value: t("workflow.demos.productRnD.stat1Value"),
        },
        {
          label: t("workflow.demos.productRnD.stat2Label"),
          value: t("workflow.demos.productRnD.stat2Value"),
        },
        {
          label: t("workflow.demos.productRnD.stat3Label"),
          value: t("workflow.demos.productRnD.stat3Value"),
        },
      ]}
    />
  );
}

// ── UX & VOC steps ──
function UxVocInterview() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <InterviewScreen
      personaSeed={1205}
      personaName={t("workflow.demos.uxVoc.interviewPersona")}
      personaMeta={t("workflow.demos.uxVoc.interviewMeta")}
      question={t("workflow.demos.uxVoc.interviewQ")}
      answer={t("workflow.demos.uxVoc.interviewA")}
    />
  );
}
function UxVocChat() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <StudyChatScreen
      userMsg={t("workflow.demos.uxVoc.chatUserMsg")}
      aiReply={t("workflow.demos.uxVoc.chatAiReply")}
      tools={[
        { name: "interviewChat", status: "done", result: "5 interviews" },
        { name: "journeyMapping", status: "done", result: "4 stages" },
        { name: "generateReport", status: "running" },
      ]}
    />
  );
}
function UxVocReport() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ReportScreen
      variant="journey"
      title={t("workflow.demos.uxVoc.reportTitle")}
      finding={t("workflow.demos.uxVoc.reportFinding")}
      stats={[
        {
          label: t("workflow.demos.uxVoc.stat1Label"),
          value: t("workflow.demos.uxVoc.stat1Value"),
        },
        {
          label: t("workflow.demos.uxVoc.stat2Label"),
          value: t("workflow.demos.uxVoc.stat2Value"),
        },
        {
          label: t("workflow.demos.uxVoc.stat3Label"),
          value: t("workflow.demos.uxVoc.stat3Value"),
        },
      ]}
    />
  );
}

// ── Sales Training steps ──
function SalesTrainingInterview() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <InterviewScreen
      personaSeed={4201}
      personaName={t("workflow.demos.salesTraining.interviewPersona")}
      personaMeta={t("workflow.demos.salesTraining.interviewMeta")}
      question={t("workflow.demos.salesTraining.interviewQ")}
      answer={t("workflow.demos.salesTraining.interviewA")}
    />
  );
}
function SalesTrainingSelect() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <SelectScreen
      title={t("workflow.demos.salesTraining.selectTitle")}
      desc={t("workflow.demos.salesTraining.selectDesc")}
      buttonText={t("workflow.demos.salesTraining.selectButton")}
      personas={[
        {
          seed: 4201,
          name: t("workflow.demos.salesTraining.persona1Name"),
          role: t("workflow.demos.salesTraining.persona1Role"),
        },
        {
          seed: 4202,
          name: t("workflow.demos.salesTraining.persona2Name"),
          role: t("workflow.demos.salesTraining.persona2Role"),
        },
        {
          seed: 4203,
          name: t("workflow.demos.salesTraining.persona3Name"),
          role: t("workflow.demos.salesTraining.persona3Role"),
        },
      ]}
    />
  );
}
function SalesTrainingFeedback() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <FeedbackScreen
      score={72}
      title={t("workflow.demos.salesTraining.feedbackTitle")}
      subtitle={t("workflow.demos.salesTraining.feedbackSub")}
      strengths={[
        t("workflow.demos.salesTraining.strength1"),
        t("workflow.demos.salesTraining.strength2"),
      ]}
      improvements={[
        t("workflow.demos.salesTraining.improve1"),
        t("workflow.demos.salesTraining.improve2"),
      ]}
      strategy={t("workflow.demos.salesTraining.strategy")}
    />
  );
}

// ── Pricing & Attribution steps ──
function PricingInput() {
  const t = useTranslations("HomeAtypicaV2");
  return <StudyInputScreen question={t("workflow.demos.pricingAttribution.question")} />;
}
function PricingDiscussion() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <DiscussionScreen
      personas={[
        { seed: 4201, name: "CTO" },
        { seed: 4202, name: "PM" },
        { seed: 4203, name: "Founder" },
        { seed: 891, name: "Analyst" },
        { seed: 1523, name: "CFO" },
        { seed: 604, name: "User" },
      ]}
      events={[
        { type: "moderator", text: t("workflow.demos.pricingAttribution.discQ") },
        {
          type: "persona",
          seed: 4202,
          name: "PM",
          text: t("workflow.demos.pricingAttribution.discReply1"),
        },
        {
          type: "persona",
          seed: 604,
          name: "User",
          text: t("workflow.demos.pricingAttribution.discReply2"),
        },
        { type: "summary", text: t("workflow.demos.pricingAttribution.discSummary") },
      ]}
    />
  );
}
function PricingReport() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ReportScreen
      variant="pricing"
      title={t("workflow.demos.pricingAttribution.reportTitle")}
      finding={t("workflow.demos.pricingAttribution.reportFinding")}
      stats={[
        {
          label: t("workflow.demos.pricingAttribution.stat1Label"),
          value: t("workflow.demos.pricingAttribution.stat1Value"),
        },
        {
          label: t("workflow.demos.pricingAttribution.stat2Label"),
          value: t("workflow.demos.pricingAttribution.stat2Value"),
        },
        {
          label: t("workflow.demos.pricingAttribution.stat3Label"),
          value: t("workflow.demos.pricingAttribution.stat3Value"),
        },
      ]}
    />
  );
}

// ── Academic Research steps ──
function AcademicInput() {
  const t = useTranslations("HomeAtypicaV2");
  return <StudyInputScreen question={t("workflow.demos.academicResearch.question")} />;
}
function AcademicChat() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <StudyChatScreen
      userMsg={t("workflow.demos.academicResearch.chatUserMsg")}
      aiReply={t("workflow.demos.academicResearch.chatAiReply")}
      tools={[
        { name: "buildPersona", status: "done", result: "200 archetypes" },
        { name: "discussionChat", status: "done", result: "20 panels" },
        { name: "reasoning", status: "running" },
        { name: "generateReport", status: "pending" },
      ]}
    />
  );
}
function AcademicReport() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ReportScreen
      variant="paper"
      title={t("workflow.demos.academicResearch.reportTitle")}
      finding={t("workflow.demos.academicResearch.reportFinding")}
      stats={[
        {
          label: t("workflow.demos.academicResearch.stat1Label"),
          value: t("workflow.demos.academicResearch.stat1Value"),
        },
        {
          label: t("workflow.demos.academicResearch.stat2Label"),
          value: t("workflow.demos.academicResearch.stat2Value"),
        },
        {
          label: t("workflow.demos.academicResearch.stat3Label"),
          value: t("workflow.demos.academicResearch.stat3Value"),
        },
      ]}
    />
  );
}

// ── Investment Prediction steps ──
function InvestmentDiscussion() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <DiscussionScreen
      personas={[
        { seed: 5001, name: "Analyst" },
        { seed: 5002, name: "Economist" },
        { seed: 5003, name: "Tech Insider" },
        { seed: 5004, name: "Fund Mgr" },
        { seed: 5005, name: "Strategist" },
        { seed: 5006, name: "Quant" },
      ]}
      events={[
        { type: "moderator", text: t("workflow.demos.investmentPrediction.discQ") },
        {
          type: "persona",
          seed: 5002,
          name: "Economist",
          text: t("workflow.demos.investmentPrediction.discReply1"),
        },
        {
          type: "persona",
          seed: 5003,
          name: "Tech Insider",
          text: t("workflow.demos.investmentPrediction.discReply2"),
        },
        { type: "summary", text: t("workflow.demos.investmentPrediction.discSummary") },
      ]}
    />
  );
}
function InvestmentSignal() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <SignalScreen
      sources={[
        {
          name: t("workflow.demos.investmentPrediction.source1Name"),
          value: t("workflow.demos.investmentPrediction.source1Value"),
          up: true,
        },
        {
          name: t("workflow.demos.investmentPrediction.source2Name"),
          value: t("workflow.demos.investmentPrediction.source2Value"),
          up: true,
        },
        {
          name: t("workflow.demos.investmentPrediction.source3Name"),
          value: t("workflow.demos.investmentPrediction.source3Value"),
          up: true,
        },
        {
          name: t("workflow.demos.investmentPrediction.source4Name"),
          value: t("workflow.demos.investmentPrediction.source4Value"),
          up: false,
        },
      ]}
      signals={[
        { label: t("workflow.demos.investmentPrediction.signal1Label"), strength: 0.73 },
        { label: t("workflow.demos.investmentPrediction.signal2Label"), strength: 0.45 },
        { label: t("workflow.demos.investmentPrediction.signal3Label"), strength: 0.62 },
        { label: t("workflow.demos.investmentPrediction.signal4Label"), strength: 0.38 },
      ]}
      trending={t("workflow.demos.investmentPrediction.signalTrending")}
    />
  );
}
function InvestmentReport() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <ReportScreen
      variant="dashboard"
      title={t("workflow.demos.investmentPrediction.reportTitle")}
      finding={t("workflow.demos.investmentPrediction.reportFinding")}
      stats={[
        {
          label: t("workflow.demos.investmentPrediction.stat1Label"),
          value: t("workflow.demos.investmentPrediction.stat1Value"),
        },
        {
          label: t("workflow.demos.investmentPrediction.stat2Label"),
          value: t("workflow.demos.investmentPrediction.stat2Value"),
        },
        {
          label: t("workflow.demos.investmentPrediction.stat3Label"),
          value: t("workflow.demos.investmentPrediction.stat3Value"),
        },
      ]}
    />
  );
}

/* ═══════════════════════════════════════════════
   8 Use Case Flow Definitions
   ═══════════════════════════════════════════════ */

export const FLOWS: Record<string, FlowDef> = {
  consumerInsight: {
    steps: [
      {
        breadcrumb: ["Study", "New Study"],
        sidebarActive: 0,
        duration: 4000,
        render: () => <ConsumerInsightInput />,
      },
      {
        breadcrumb: ["Study", "Research Plan"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <ConsumerInsightPlan />,
      },
      {
        breadcrumb: ["Study", "Scout"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <ConsumerInsightScout />,
      },
      {
        breadcrumb: ["Study", "Report"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <ConsumerInsightReport />,
      },
    ],
  },

  conceptTesting: {
    steps: [
      {
        breadcrumb: ["Panel", "Focus Group"],
        sidebarActive: 1,
        duration: 5500,
        render: () => <ConceptTestingDiscussion />,
      },
      {
        breadcrumb: ["Study", "Console"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <ConceptTestingChat />,
      },
      {
        breadcrumb: ["Study", "Report"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <ConceptTestingReport />,
      },
    ],
  },

  productRnD: {
    steps: [
      {
        breadcrumb: ["Study", "Trend Scout"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <ProductRnDScout />,
      },
      {
        breadcrumb: ["Study", "Inspiration"],
        sidebarActive: 0,
        duration: 5500,
        render: () => <ProductRnDInspiration />,
      },
      {
        breadcrumb: ["Study", "Product Concept"],
        sidebarActive: 0,
        duration: 5500,
        render: () => <ProductRnDReport />,
      },
    ],
  },

  uxVoc: {
    steps: [
      {
        breadcrumb: ["Panel", "Interview"],
        sidebarActive: 1,
        duration: 5500,
        render: () => <UxVocInterview />,
      },
      {
        breadcrumb: ["Study", "Console"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <UxVocChat />,
      },
      {
        breadcrumb: ["Study", "Report"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <UxVocReport />,
      },
    ],
  },

  salesTraining: {
    steps: [
      {
        breadcrumb: ["Training", "Select Target"],
        sidebarActive: 3,
        duration: 4000,
        render: () => <SalesTrainingSelect />,
      },
      {
        breadcrumb: ["Training", "Simulation"],
        sidebarActive: 3,
        duration: 5500,
        render: () => <SalesTrainingInterview />,
      },
      {
        breadcrumb: ["Training", "Feedback"],
        sidebarActive: 3,
        duration: 4500,
        render: () => <SalesTrainingFeedback />,
      },
    ],
  },

  pricingAttribution: {
    steps: [
      {
        breadcrumb: ["Study", "New Study"],
        sidebarActive: 0,
        duration: 4000,
        render: () => <PricingInput />,
      },
      {
        breadcrumb: ["Panel", "Expert Panel"],
        sidebarActive: 1,
        duration: 5500,
        render: () => <PricingDiscussion />,
      },
      {
        breadcrumb: ["Study", "Report"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <PricingReport />,
      },
    ],
  },

  academicResearch: {
    steps: [
      {
        breadcrumb: ["Study", "New Study"],
        sidebarActive: 0,
        duration: 4000,
        render: () => <AcademicInput />,
      },
      {
        breadcrumb: ["Study", "Console"],
        sidebarActive: 0,
        duration: 5500,
        render: () => <AcademicChat />,
      },
      {
        breadcrumb: ["Study", "Report"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <AcademicReport />,
      },
    ],
  },

  investmentPrediction: {
    steps: [
      {
        breadcrumb: ["Panel", "Expert Panel"],
        sidebarActive: 1,
        duration: 5500,
        render: () => <InvestmentDiscussion />,
      },
      {
        breadcrumb: ["Study", "Signal Tape"],
        sidebarActive: 0,
        duration: 5500,
        render: () => <InvestmentSignal />,
      },
      {
        breadcrumb: ["Study", "Report"],
        sidebarActive: 0,
        duration: 5000,
        render: () => <InvestmentReport />,
      },
    ],
  },
};
