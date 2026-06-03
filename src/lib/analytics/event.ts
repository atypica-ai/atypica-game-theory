export type TAnalyticsEvent = {
  game_created: {
    game_type: string;
    player_count: number;
    mode: "ai_vs_ai" | "human_vs_ai";
  };
  game_completed: {
    game_type: string;
    mode: "ai_vs_ai" | "human_vs_ai";
    rounds_played: number;
  };
  human_discussion_submitted: { game_type: string; round: number };
  human_decision_submitted: { game_type: string; round: number };
  tournament_created: { player_count: number };
  tournament_completed: Record<string, never>;
  game_replay_viewed: { game_type: string };
};

export function trackEvent<E extends keyof TAnalyticsEvent>(
  event: E,
  ...args: TAnalyticsEvent[E] extends Record<string, never>
    ? []
    : [params: TAnalyticsEvent[E]]
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, args[0]);
  }
}
