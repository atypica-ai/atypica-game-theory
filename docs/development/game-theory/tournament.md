# Tournament

## What It Is

A **Tournament** runs 100 AI personas through three successive stages of game-theory games, eliminating players between stages, to crown a single champion (or a small tied cohort).

---

## 赛制：小组循环晋级赛 (Group Stage Qualification)

The same format used in FIFA World Cup group stages and Chinese esports tournaments. Each stage divides remaining players into small groups that each play a complete game. After all groups finish, **all players in the stage are ranked together** by cumulative payoff — cross-group, not per-group. The top N advance.

### Why stage-wise ranking (not per-group)?

Group-collusion problem: a group that coordinates on moderate cooperation could all tie and all advance, even if their scores are lower than non-advancing players in other groups. Stage-wise ranking ensures the top-20 are genuinely the top-20 scorers across the whole stage.

---

## Stages

### Stage 1 — Stag Hunt (100 → ~20)

- 100 players → 10 groups of 10, shuffled randomly
- Each group plays one full Stag Hunt game (3 rounds, 1 discussion round per round)
- All 100 players ranked together by cumulative payoff → top **20** advance
- Expected output: ~20 players; ties at the cut-line also advance (so could be 21–25)

### Stage 2 — Golden Ball (~20 → ~4)

- Players divided into groups of ~5 (e.g. 20 players → 4 groups of 5)
- Each group plays one full Golden Ball game (3 rounds, 1 discussion round per round)
- All ~20 players ranked together → top **4** advance
- Expected output: ~4 players; ties push this to ~6 (Beauty Contest supports up to 10)

### Stage 3 — Beauty Contest (~4 → champion)

- All remaining players in a single group
- Play one full Beauty Contest game (3 rounds, 1 discussion round per round)
- No elimination — champion = highest cumulative payoff

---

## Advancement Rule: 1224 Competition Ranking

Standard format used in Chinese/international sports competitions. Ties share the same rank; the next rank skips the tied count.

```
Payoffs [35, 30, 30, 20] → ranks [1, 2, 2, 4]
  top-2 → advances: ranks 1, 2, 2 → 3 players (tie at 2 included)

Payoffs [35, 35, 30, 20] → ranks [1, 1, 3, 4]
  top-2 → advances: ranks 1, 1 only → 2 players (no rank-2 exists)
```

Rule: `player.advances = player.rank <= n`. Ties at the cut-line always advance ("晋级线以上全部晋级").

---

## Known Trade-offs

**Inter-group luck**: Players face different opponents across groups. Random group assignment mitigates systematic bias, but some variance is inherent to all group-stage formats.

**Rabbit free-rider (Stag Hunt)**: Rabbit hunters who benefit from a successful stag hunt earn 35 pts vs. stag hunters' 25 pts. A pure free-rider can advance without cooperating. This is intentional — the game rewards strategic opportunism — but means advancement ≠ "best cooperator."

**Beauty Contest convergence**: Sophisticated AI personas may converge toward 0 (the Nash equilibrium) after 1–2 rounds with revealed averages. The discussion round before each decision encourages bluffing and coordination attempts that can delay convergence.

**Variable finalist count**: Ties mean Stage 3 can have 4–8 players. Beauty Contest supports 4–10, so this is always safe.
