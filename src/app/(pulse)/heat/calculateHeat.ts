import "server-only";

import { HEAT_CONFIG } from "./config";
import type { PulsePostData } from "./types";

/**
 * Min-max normalization (0-1 scale)
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized)); // Clamp to [0, 1]
}

/**
 * Calculate HEAT score using HDI-style methodology:
 * 1. Normalize each dimension to 0-1 using goalposts
 * 2. Apply weighted geometric mean
 */
export function calculateHeatScore(posts: PulsePostData[]): number {
  if (posts.length === 0) return 0;

  const postScores: number[] = [];

  for (const post of posts) {
    const views = post.views || 0;
    const likes = post.likes || 0;
    const retweets = post.retweets || 0;
    const replies = post.replies || 0;

    if (views === 0) continue;

    // Step 1: Calculate reach index (log-normalized, like HDI income)
    const logViews = Math.log10(views + 1);
    const logMin = Math.log10(HEAT_CONFIG.GOALPOSTS.VIEWS_MIN + 1);
    const logMax = Math.log10(HEAT_CONFIG.GOALPOSTS.VIEWS_MAX + 1);
    const reachIndex = normalize(logViews, logMin, logMax);

    // Step 2: Calculate intensity index
    const weightedEngagement =
      likes * HEAT_CONFIG.ENGAGEMENT_WEIGHTS.likes +
      retweets * HEAT_CONFIG.ENGAGEMENT_WEIGHTS.retweets +
      replies * HEAT_CONFIG.ENGAGEMENT_WEIGHTS.replies;

    const rawEngagementRate = weightedEngagement / views;
    const cappedEngagementRate = Math.min(rawEngagementRate, HEAT_CONFIG.MAX_ENGAGEMENT_RATE);

    const intensityIndex = normalize(
      cappedEngagementRate,
      HEAT_CONFIG.GOALPOSTS.ENGAGEMENT_MIN,
      HEAT_CONFIG.GOALPOSTS.ENGAGEMENT_MAX,
    );

    // Step 3: Weighted geometric mean (HDI formula)
    const w_r = HEAT_CONFIG.REACH_WEIGHT;
    const w_i = HEAT_CONFIG.INTENSITY_WEIGHT;

    const normalizedScore = Math.pow(
      Math.pow(reachIndex, w_r) * Math.pow(intensityIndex, w_i),
      1 / (w_r + w_i),
    );

    // Scale to human-readable range (0-1000)
    const postScore = normalizedScore * HEAT_CONFIG.SCORE_MULTIPLIER;

    postScores.push(postScore);
  }

  if (postScores.length === 0) return 0;

  return topKAverage(postScores, HEAT_CONFIG.TOP_K || 3);
}

function topKAverage(values: number[], k: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => b - a);
  const topK = sorted.slice(0, Math.min(k, sorted.length));
  return topK.reduce((sum, val) => sum + val, 0) / topK.length;
}
