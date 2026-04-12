# Statistics & Data Visualization Plan

## Current State

- **145 sessions** (83 completed, 61 failed, 1 running) across 10 game types
- 9 game-specific distribution charts exist in the UI — **all using mock data**
- Each chart compares AI behavior vs published human experimental baselines (cited papers)
- Charts use Recharts (BarChart + custom PMF renderer), shared via `AcademicChart.tsx`
- Home page shows real session counts per game type; everything else is hardcoded
- System is already structured for the swap: `TODO: replace with live aggregation`

### Completed Sessions by Game Type

| Game Type | Completed | Min for Stats |
|-----------|-----------|--------------|
| prisoner-dilemma | 22 | Ready |
| trolley-problem | 14 | Ready |
| ultimatum-game | 12 | Ready |
| volunteer-dilemma | 7 | Borderline |
| all-pay-auction | 6 | Borderline |
| colonel-blotto | 6 | Borderline |
| golden-ball | 5 | Need more |
| stag-hunt | 5 | Need more |
| public-goods | 4 | Need more |
| beauty-contest | 2 | Need more |

**Target: 30+ completed sessions per game type** before switching from mock to real data. At current run rates, achievable in 1-2 weeks.

---

## Tier 1: Per-Game-Type Distribution Charts (replace mock data)

These already exist in the UI. The work is: replace hardcoded arrays with live DB aggregation.

### What Each Chart Shows

| Game | Chart | Scope | X-axis | Y-axis | Human Baseline Source |
|------|-------|-------|--------|--------|---------------------|
| Prisoner's Dilemma | Cooperation rate by round | All rounds | R1-R4 | % Cooperate | Dal Bo & Frechette 2011, AER |
| Stag Hunt | Stag-choice rate by round | All rounds | R1-R3 | % Stag | Van Huyck et al. 1990 |
| Golden Ball | Split rate by round | All rounds | R1-R3 | % Split | van den Assem et al. 2012 |
| Beauty Contest | Guess distribution | Round 1 only | Bins 0-9...90-100 | % of guesses | Nagel 1995 |
| Public Goods | Contribution distribution | Round 1 only | Bins 0-4...20 | % of players | Ledyard 1995 meta-analysis |
| Ultimatum Game | Offer distribution | Round 1 only | % of endowment bins | % of proposers | Guth et al. 1982 |
| Volunteer Dilemma | Volunteer rate | Round 1 only | Volunteer / Not | % | Diekmann 1985, Franzen 1995 |
| All-Pay Auction | Bid distribution | Round 1 only | Bid ranges | % of bids | Gneezy & Smorodinsky 2006 |
| Trolley Problem | Pull/Push rates | Round 1 only | Classic / Fat Man | % | Foot 1967, Thomson 1985 |
| Colonel Blotto | Strategy clusters | Round 1 only | 4 strategy types | % | Borel 1921, Roberson 2006 |

---

## Tier 2: Cross-Cutting Statistics

### 2A. Model Provider Comparison (per game type)

**Question:** Do Claude, GPT, and Gemini behave differently in the same game?

Per game type, grouped bar chart showing the game's key behavioral metric broken down by model:

| Game | Metric by Model |
|------|-----------------|
| Prisoner's Dilemma | Cooperation rate per round, by model |
| Stag Hunt | Stag-choice rate per round, by model |
| Golden Ball | Split rate per round, by model |
| Public Goods | Mean contribution per round, by model |
| Beauty Contest | Mean guess, by model |
| Ultimatum Game | Mean offer %, by model |
| Volunteer Dilemma | Volunteer rate, by model |
| All-Pay Auction | Mean bid, by model |
| Trolley Problem | Pull/Push rate, by model |
| Colonel Blotto | Strategy distribution, by model |

**Plus: overall win rate by model across all games.** Normalized so each game contributes equally (win rate within game, then averaged).

**Minimum data needed:** ~15 decisions per model per game type.

### 2B. Discussion Effect (with vs without)

**Question:** Does pre-decision discussion change strategic behavior in LLMs?

Per game type (for games that support discussion), side-by-side comparison of the same metric with and without discussion:

| Game | Metric: With Discussion vs Without |
|------|-----------------------------------|
| Stag Hunt | Stag-choice rate |
| Public Goods | Mean contribution |
| Beauty Contest | Mean guess |
| Colonel Blotto | Strategy distribution |
| Volunteer Dilemma | Volunteer rate |
| All-Pay Auction | Mean bid |
| Trolley Problem | Pull/Push rate |

Games with `discussionRounds: 0` by default (prisoner-dilemma, golden-ball, ultimatum-game) are excluded — they never have discussion.

**Minimum data needed:** ~20 sessions per game type per condition (discussion/no-discussion).

### 2C. Leaderboards (persona & human ranking)

**Two leaderboards:**

1. **Overall Leaderboard** — ranks all participants (personas + humans) by total win rate across all games they've played. Shows name, games played, win rate, best game type.

2. **Persona Leaderboard** — ranks AI personas only. Same metrics, but adds model provider and persona tags as metadata columns.

Win rate definition: % of games where the participant finished with the highest (or tied-highest) cumulative payoff.

### 2D. Persona Tag Effect

**Question:** Do persona background tags correlate with strategic behavior?

Group personas by their tags and compare **win rate** across tag groups. For example: do personas tagged "risk-averse" actually win less in high-risk games (All-Pay, Colonel Blotto)?

Visualization: horizontal bar chart of win rate by tag, sorted descending. Only show tags with sufficient sample size (5+ personas).

---

## Implementation Priority

| Priority | What | Effort | Data Needed |
|----------|------|--------|-------------|
| **P0** | Replace mock data in existing 9 charts | Medium | 30+ sessions/game |
| **P1** | Model provider comparison per game (2A) | Medium | 15 decisions/model/game |
| **P1** | Discussion effect per game (2B) | Medium | 20 sessions/game/condition |
| **P1** | Model win rate across all games (2A) | Low | Same as above |
| **P2** | Overall leaderboard (2C) | Medium | 50+ sessions |
| **P2** | Persona leaderboard (2C) | Medium | Same |
| **P2** | Tag-based win rate (2D) | Low | 50+ sessions, 5+ personas/tag |

## Data Collection Strategy

Keep running the random game cron job with current settings:
- **50/50 discussion toggle** provides balanced A/B data
- **3 model families** randomly assigned gives natural model comparison data
- **maxPlayers=6** keeps sessions completing reliably

### Milestones

| Milestone | Sessions Needed | Unlocks |
|-----------|----------------|---------|
| 300 completed | ~3 weeks | P0: Real data in all charts |
| 500 completed | ~5 weeks | P1: Model comparison + discussion effect |
| 1000 completed | ~10 weeks | P2: Leaderboards with meaningful rankings |
