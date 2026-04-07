# Game Theory Games - Implementation Reference

This document catalogs game theory games for AI vs. human player research. It includes both implemented games and candidate games for future implementation.

## Selection Criteria

Games in this project should meet these requirements:

1. **Clear Winner**: The game must have a deterministic winner or ranking system (avoid easy ties)
2. **Competitive Dynamics**: Games should maintain "博弈性" (strategic competitiveness) even with discussion/multi-round features
3. **AI vs Human Difference**: The game should reveal meaningful behavioral differences between AI agents and human players from an academic perspective
4. **Scalability**: Preferably support 4-10 players for group dynamics

## Implementation Features

Most games in this system support:
- **Multi-round play**: Typically 3 rounds to observe strategy evolution
- **Discussion rounds**: Pre-decision discussion phases that dramatically change game dynamics
- **Simultaneous reveal**: Hidden decisions until all players commit
- **Elimination mechanic**: Lowest scorers face consequences ("pruned forever")

---

## Implemented Games

### 1. Stag Hunt (Free-Rider Variant) ✅

**Status**: Implemented (`src/app/(game-theory)/gameTypes/stagHunt/`)

**Players**: 4-10 players

**Rounds**: 3 rounds (fixed)

**Discussion**: 1 discussion round before each decision

**How It Works**:
Each round, players choose STAG or RABBIT:
- **RABBIT**: Always earn 10 points (safe choice)
- **STAG**: Risky cooperation - requires threshold T = ⌈40% × N⌉ players to succeed
  - Success: Each stag hunter earns 25 points
  - Failure: Stag hunters earn 0 points

**Key Modification - Free-Rider Mechanic**:
This is NOT classic Stag Hunt. The stag hunt is implemented as a **public good**:
- When stag hunt succeeds, EVERYONE benefits (+25 points), including rabbit hunters
- Rabbit hunters who benefit get: 10 (private) + 25 (public) = **35 points total**
- This creates dominant free-rider incentive: "Why risk stag when I can pocket both rewards with rabbit?"

**Why This Alteration**:
Classic Stag Hunt has weak free-rider incentives. By making successful hunt a public good, we create stronger tension between cooperation and defection, making the game more competitive and revealing behavioral differences.

**Winner Determination**: Highest cumulative score after 3 rounds. Ties broken by most stag attempts (rewards boldness).

**Recommendation**: ⭐⭐⭐⭐⭐ Highly recommended. The free-rider modification creates rich strategic dynamics, especially with discussion rounds. AI vs human differences are pronounced - humans may coordinate through discussion, while AI agents may calculate optimal defection strategies.

---

### 2. Beauty Contest (Keynes Beauty Contest) ✅

**Status**: Implemented (`src/app/(game-theory)/gameTypes/beautyContest/`)

**Players**: 4-10 players

**Rounds**: 3 rounds (fixed)

**Discussion**: 1 discussion round before each decision

**How It Works**:
Each round, players pick an integer from 0 to 100. The winner is whoever picks closest to **⅔ of the group average**.

**Scoring**:
- Winner(s): Share 50 points equally (rounded down)
- All others: 0 points
- Ties: Multiple winners split the pot

**Example** (4 players pick 20, 40, 60, 80):
- Average = 50
- Target = ⅔ × 50 ≈ 33.3
- Player who picked 40 wins (closest to 33.3)

**Strategic Depth**:
This is a k-level reasoning game:
- Level 0: Pick randomly around 50
- Level 1: Others pick 50, so I pick ⅔ × 50 = 33
- Level 2: Others think level 1, so I pick ⅔ × 33 = 22
- Level ∞: Nash equilibrium is everyone picks 0

Discussion rounds add meta-gaming: Can you trust what others say?

**Winner Determination**: Highest cumulative score after 3 rounds. Clear winners in most cases.

**Recommendation**: ⭐⭐⭐⭐⭐ Highly recommended. This game is perfect for AI vs human research - it directly measures depth of strategic reasoning. AI agents may converge to Nash equilibrium faster, while humans exhibit anchoring biases and limited k-level thinking. Academic significance is high.

---

### 3. Golden Ball ✅

**Status**: Implemented (`src/app/(game-theory)/gameTypes/goldenBall/`)

**Players**: 4-10 players

**Rounds**: 3 rounds (fixed)

**Discussion**: No discussion (0 rounds) - pure simultaneous play

**How It Works**:
Each round, players declare SPLIT or STEAL. Pot worth: 50 points.

**Payoff Rules** (the twist):
- **0 stealers** (all split): Everyone shares equally (50 ÷ N)
- **Exactly 1 stealer**: Stealer takes entire 50 points, splitters get 0
- **2+ stealers**: All stealers get 0, splitters share the pot equally (50 ÷ splitters)

**Examples** (4 players):
- All split → 12 each
- 1 steal, 3 split → stealer: 50, splitters: 0
- 2 steal, 2 split → stealers: 0, splitters: 25 each
- 3 steal, 1 split → stealers: 0, splitter: 50

**Strategic Tension**:
The "exactly 1 stealer wins all" creates unique dynamics:
- Temptation to be the lone stealer
- But if multiple people think this way, stealers all lose
- Splitters become winners when stealing gets crowded

**Winner Determination**: Highest cumulative score after 3 rounds. Very competitive - no discussion means pure strategy execution.

**Recommendation**: ⭐⭐⭐⭐ Recommended. The multi-stealer punishment mechanism creates interesting dynamics. Good for observing trust vs greed. However, without discussion rounds, the game may feel more random. Consider adding discussion as a variant to increase strategic depth.

**Note**: This game punishes multiple defectors, unlike classic Prisoner's Dilemma. The "2+ stealers all lose" rule creates second-order thinking about how many others will steal.

---

### 4. Prisoner's Dilemma ✅

**Status**: Implemented (`src/app/(game-theory)/gameTypes/prisonerDilemma/`)

**Players**: Exactly 2 players (pairwise only)

**Rounds**: 4 rounds (fixed)

**Discussion**: No discussion (0 rounds) - players cannot communicate

**How It Works**:
Based on Dal Bó & Fréchette (2011) "easy" treatment. Each round, players choose COOPERATE or DEFECT.

**Payoff Matrix**:
```
                Opponent Cooperates    Opponent Defects
You Cooperate        51, 51               22, 63
You Defect           63, 22               39, 39
```

- Mutual cooperation: 51 each
- You cooperate, they defect: 22 (sucker) vs 63 (temptation)
- Mutual defection: 39 each

**Game Theory Properties**:
- T(63) > R(51) > P(39) > S(22) ← Classic PD ordering
- 2R(102) > T+S(85) ← Cooperation is socially optimal
- K = (T-R)/(R-S) = 12/29 ≈ 0.41 ← Moderate temptation

**Why This Specific Payoff Matrix**:
These values are from published academic experiments, not arbitrary. The K value of 0.41 represents moderate defection temptation - cooperation is meaningful but defection is tempting.

**Winner Determination**: Highest cumulative score after 4 rounds.

**Recommendation**: ⭐⭐ Not strongly recommended for this project.

**Problems**:
1. **Easy ties**: Mutual cooperation (51,51) and mutual defection (39,39) produce identical scores for both players. With 4 rounds, many games end in ties.
2. **Only 2 players**: Cannot observe group dynamics or scaling effects
3. **Well-studied**: Less novelty for academic research - AI vs human differences in PD are extensively documented
4. **Predictable**: With no discussion and repeated play, strategies often converge to tit-for-tat or defection

**When It Works**: Useful as a baseline or control condition, but not as a primary research focus. Better for demonstrating known effects than discovering new insights.

---

## Candidate Games for Implementation

These games have been researched and evaluated for potential implementation. They are ordered by recommendation strength.

---

### 5. All-Pay Auction ⭐⭐⭐⭐⭐ HIGHLY RECOMMENDED

**Status**: Not yet implemented

**Players**: 2-10 players

**Suggested Rounds**: 3 rounds

**Suggested Discussion**: 1 round (adds psychological warfare)

**How It Works**:
Players bid on a prize (e.g., 100 points). The highest bidder wins the prize. **BUT: Everyone pays their bid, win or lose.**

**Rules**:
- Bid any amount from 0 to your maximum
- Highest bid wins the prize
- **All players pay their bid** (even losers)
- Ties: Prize split equally among tied bidders (all still pay full bid)

**Example** (Prize = 100 points):
- Player A bids 40, Player B bids 60, Player C bids 30
- Player B wins 100 points but pays 60 = net +40
- Player A loses but pays 40 = net -40
- Player C loses but pays 30 = net -30

**Strategic Depth**:
This game creates **escalation dynamics**:
- Rational equilibrium: bid nothing (expected value = 0)
- But once someone bids, others want to "win back" their potential losses
- Creates sunk cost fallacy and escalation of commitment
- Known to generate overbidding in experiments (sellers revenue > prize value)

**Why Excellent for This Project**:
1. **Always has clear winner**: Highest bidder wins (ties rare with discussion)
2. **Strong AI vs human difference**: AI may calculate Nash equilibrium (low bids), humans exhibit escalation bias and sunk cost fallacy
3. **High 博弈性**: Extremely competitive, psychological warfare
4. **Academic significance**: Classic model for wasteful competition (arms races, rent-seeking)
5. **Discussion amplifies**: Pre-bid discussion adds signaling and deception

**Implementation Suggestions**:
- Normalize prize to 100 points
- Allow bids from 0-100 (or 0-150 to allow overbidding)
- Track cumulative net scores across rounds
- Winner: Highest cumulative net profit (prize wins minus bid costs)

**Academic Reference**: All-pay auctions model wars of attrition, lobbying, R&D races, and any competition where effort is non-recoverable.

---

### 6. Volunteer's Dilemma ⭐⭐⭐⭐

**Status**: Not yet implemented

**Players**: 3-10 players

**Suggested Rounds**: 3 rounds

**Suggested Discussion**: 0-1 rounds (changes dynamics significantly)

**How It Works**:
A public good is produced if **at least one player volunteers**. All players benefit from the public good, but volunteers pay a cost.

**Rules** (standard formulation):
- Each player chooses: VOLUNTEER or NOT VOLUNTEER
- If ≥1 volunteers: Public good produced, everyone gets benefit B (e.g., 50 points)
- Volunteers additionally pay cost C (e.g., 20 points)
  - Volunteer net: B - C = 30
  - Non-volunteer net: B = 50 (free-rider wins!)
- If 0 volunteers: Everyone gets 0

**Strategic Tension**:
- Everyone wants someone else to volunteer (free-rider incentive)
- But if everyone thinks this way, nobody volunteers → disaster
- Classic "bystander effect" / diffusion of responsibility

**Multiple Volunteers Problem**:
What if multiple people volunteer? Three implementation options:

1. **Each pays full cost** (theoretical default): Creates redundant cost
2. **Cost sharing**: C divided among k volunteers (C/k each) - increases volunteering
3. **Lottery**: Randomly select 1 volunteer to pay C - common in experiments

**Why Good for This Project**:
1. **Clear winner determination**: Non-volunteers win (free-riders) when exactly 1 volunteers. Worst outcome: being the solo volunteer when others could have helped.
2. **Strong AI vs human difference**: AI may calculate Nash equilibrium mixed strategies, humans show "let-me-do-it" altruism and heterogeneous volunteering rates
3. **Scales well**: 3-10 players, larger groups = stronger bystander effect
4. **Discussion changes game**: With discussion, coordination becomes possible (turn-taking)

**Implementation Challenges**:
- **Tie risk**: If multiple volunteers use cost-sharing, scores may tie
- **No-volunteer disaster**: If nobody volunteers, round is wasted (0 for all)
- **Winner clarity**: Need to carefully design scoring so free-riders have advantage but volunteers get some reward

**Suggested Implementation**:
- Use **lottery rule**: If k ≥ 1 volunteers, randomly select 1 to pay cost C, everyone gets B
- This creates clear differential: Solo volunteer pays, others free-ride
- Benefit B = 50, Cost C = 30, so volunteer net = 20, non-volunteer = 50
- Track cumulative scores - consistent free-riders win

**Academic Significance**: Models bystander effect, diffusion of responsibility, public goods provision. Well-studied experimentally.

**Recommendation**: ⭐⭐⭐⭐ Recommended with careful implementation. Use lottery rule to avoid ties. Consider adding "volunteer bonus" to avoid volunteer always losing.

---

### 7. Weakest Link / Minimum Effort Game ⭐⭐⭐

**Status**: Not yet implemented

**Players**: 4-10 players

**Suggested Rounds**: 3-5 rounds (learning dynamics important)

**Suggested Discussion**: 1-2 rounds (crucial for coordination)

**How It Works**:
Players choose an effort level (e.g., 1-7). Everyone's reward is based on the **minimum effort anyone chooses**. Higher effort costs more.

**Rules** (standard formulation):
- Each player chooses effort level k ∈ {1, 2, ..., 7}
- Cost per unit effort: c (e.g., c = 10)
- Benefit per unit of minimum: b (e.g., b = 20)
- Payoff for player i: b × min(all efforts) - c × (my effort)

**Example** (4 players):
- Players choose: 5, 6, 6, 7
- Minimum = 5
- Payoffs (with b=20, c=10):
  - Player who chose 5: 20×5 - 10×5 = 100 - 50 = 50
  - Player who chose 6: 20×5 - 10×6 = 100 - 60 = 40
  - Player who chose 6: 20×5 - 10×6 = 100 - 60 = 40
  - Player who chose 7: 20×5 - 10×7 = 100 - 70 = 30

**Strategic Insight**:
- **High effort is risky**: If you choose 7 but someone else chooses 1, you pay high cost for low benefit
- **Multiple equilibria**: Any level k where everyone chooses k is a Nash equilibrium
- **Coordination failure**: Tendency to cascade down to low-effort equilibrium over rounds
- **Lowest chooser "wins"**: The minimum chooser gets highest payoff (equal benefit, lowest cost)

**Why It's Interesting**:
1. **Clear winner**: Minimum chooser gets best payoff (benefit without wasted cost)
2. **Coordination challenge**: Requires trust - everyone must commit to high effort
3. **Learning dynamics**: Experiments show convergence to low equilibrium without intervention
4. **Discussion matters**: Communication can achieve high-effort coordination

**Problems for This Project**:
1. **Tie tendency**: If everyone coordinates, everyone gets same score (equilibrium = tie)
2. **Dominant strategy**: Choosing minimum is always best → reduces 博弈性
3. **Winner is "saboteur"**: Lowest chooser wins by ruining group outcome
4. **Predictable**: Once someone goes low, everyone cascades down

**Recommendation**: ⭐⭐⭐ Moderately recommended.

**When It Works Well**:
- First 1-2 rounds show coordination attempts, then observation of cascade failures
- Interesting for coordination research, but less competitive than other games
- Better for studying cooperation breakdown than strategic competition

**If Implementing**: Add asymmetry (different costs for different players) or make minimum chooser face penalty to maintain competitiveness.

---

### 8. Public Goods Game / Tragedy of Commons ⭐⭐⭐

**Status**: Not yet implemented

**Players**: 4-10 players

**Suggested Rounds**: 3-5 rounds

**Suggested Discussion**: 1 round (helps cooperation but doesn't guarantee it)

**How It Works**:
Players decide how much to contribute to a public pool. The pool is multiplied and redistributed to everyone.

**Rules** (standard formulation):
- Each player starts with endowment E (e.g., 20 tokens)
- Choose contribution c to public pool, where 0 ≤ c ≤ E
- Keep the rest: private = E - c
- Public pool multiplied by factor m (e.g., 1.5), then split equally
- Payoff = (E - c) + (sum of all contributions × m / N)

**Example** (4 players, E=20, m=1.6):
- Contributions: 10, 10, 20, 0
- Pool = 40 × 1.6 = 64 → each gets 64/4 = 16 from pool
- Payoffs:
  - Players who gave 10: (20-10) + 16 = 26
  - Player who gave 20: (20-20) + 16 = 16
  - Free-rider (gave 0): (20-0) + 16 = 36 ← winner!

**Strategic Dilemma**:
- **Social optimum**: Everyone contributes everything (E×m/N > E when m > 1)
- **Nash equilibrium**: Everyone contributes 0 (defection dominant)
- **Free-rider advantage**: Give 0, benefit from others' contributions

**Tragedy of Commons Variant**:
Resource extraction version (fishing, grazing):
- Shared resource pool R
- Each player extracts amount x
- Payoff = benefit(x) - cost(total extraction)
- Over-extraction depletes resource → tragedy

**Why It's Classic**:
- Models climate change, resource management, team production
- Rich academic literature
- Scales naturally to large groups

**Problems for This Project**:
1. **Continuous space**: Contribution is continuous (0-20), not discrete → harder for clear strategic choices
2. **Tie risk**: Partial cooperators may end up with similar scores
3. **Free-rider always wins**: Zero-contributor beats everyone → predictable
4. **No clear winner mechanism**: Need to add competitive element

**Possible Modifications for Clear Winners**:
1. **Top contributor bonus**: Reward highest contributor with extra points
2. **Threshold**: Pool only multiplies if total contributions exceed threshold T
3. **Elimination**: Lowest contributors face penalty
4. **Resource depletion**: Fixed resource shrinks each round based on extraction

**Recommendation**: ⭐⭐⭐ Moderately recommended.

**Better for cooperation research** than competitive tournaments. Consider hybrid: Public Goods + Elimination (lowest contributors pruned) to maintain competitiveness.

**If Implementing**: Use discrete contribution levels (0, 5, 10, 15, 20) and add elimination mechanic for lowest contributors to create clear losers.

---

### 9. El Farol Bar Problem / Minority Game ⭐⭐

**Status**: Not yet implemented

**Players**: Ideally 50-100+ (large groups) or scaled version for 10-20

**Suggested Rounds**: Many rounds (10+) for learning dynamics

**Suggested Discussion**: Not applicable (ruins the problem)

**How It Works**:
Players decide whether to attend a bar (or choose an option). The bar has capacity limit. If attendance > capacity, attendees have bad time; if attendance ≤ capacity, attendees have good time. Non-attendees have okay time.

**Rules** (classic formulation):
- Capacity C = 60% of N players
- Each player independently decides: GO or STAY HOME
- Payoffs:
  - Go + attendance ≤ C: +2 (good time)
  - Go + attendance > C: -1 (crowded, bad time)
  - Stay home: 0 (okay time)
- No pure strategy equilibrium exists

**Minority Game Variant**:
Simplified binary version:
- Choose A or B
- Minority group wins (+1), majority loses (-1)
- No equilibrium - cyclic dynamics

**Why It's Famous**:
- Models bounded rationality, adaptive learning
- Complex dynamics, chaos, emergent patterns
- Real-world: traffic, restaurant choice, market timing

**Problems for This Project**:
1. **No equilibrium**: No stable strategy → hard to evaluate "good" play
2. **Large N needed**: Works best with 50-100+ players for statistical effects
3. **Many rounds needed**: Single round is random, patterns emerge over 100+ rounds
4. **Unclear winner**: Who wins in a single round? The minority, but it rotates
5. **Loses 博弈性**: Less about strategic thinking, more about prediction/adaptation
6. **Discussion ruins it**: Communication allows coordination → solves the problem

**Recommendation**: ⭐⭐ Not recommended for this project.

**Why Not Suitable**:
- Requires large N and many rounds
- No clear winner in short games
- Better for econophysics research than game theory tournaments
- AI vs human differences unclear (both may use similar heuristics)

**When It Might Work**: 
If implementing a "prediction tournament" where goal is to predict group behavior over many rounds. But this shifts focus from strategic play to forecasting.

---

### 10. Centipede Game / Dollar Auction ⭐⭐

**Status**: Not yet implemented

**Players**: 2 players (pairwise sequential)

**Nature**: Sequential (turn-based), not simultaneous

**How It Works** (Centipede):
Sequential game where players alternate choosing TAKE or PASS. Pot grows each turn. Taking ends game immediately.

**Rules**:
- Start with pot = 1
- Player 1: TAKE (game ends, gets 1, P2 gets 0) or PASS (pot grows)
- Player 2: TAKE (game ends, gets most, P1 gets some) or PASS (pot grows)
- Continue alternating
- Each PASS multiplies pot
- Backward induction says TAKE immediately, but cooperation grows the pot

**Dollar Auction Variant**:
- Auction a $20 bill
- Both highest AND second-highest bidder pay their bids
- Only highest bidder gets the $20
- Creates escalation trap

**Why Famous**:
- Tests backward induction vs cooperation
- Shows limits of game-theoretic reasoning
- Dollar auction demonstrates escalation commitment

**Problems for This Project**:
1. **Only 2 players**: Can't scale to group dynamics
2. **Sequential, not simultaneous**: Different information structure
3. **Turn-based slows gameplay**: Requires waiting for other player
4. **Dollar auction is essentially all-pay auction**: Already covered above
5. **Centipede has ambiguous winner**: Cooperation wins more than defection, but theory says defect

**Recommendation**: ⭐⭐ Not recommended.

**Reason**: Only 2 players, sequential play doesn't fit the simultaneous-reveal framework, and Dollar Auction is redundant with All-Pay Auction. Better to implement multi-player simultaneous games.

---

## Additional Game Theory Games (Theoretical Interest)

These games have academic significance but face implementation challenges for our competitive tournament format.

### 11. Ultimatum Game (Sequential Bargaining)

**Status**: Not yet implemented

**Players**: 2 players (pairwise)

**Nature**: Sequential, not simultaneous

**How It Works**:
Two players divide a fixed sum (e.g., 100 points):
- **Proposer**: Offers a split (e.g., "I take 70, you take 30")
- **Responder**: Accepts (both get the split) or Rejects (both get 0)

**Strategic Tension**:
- Game theory predicts: Proposer offers minimum (99-1), Responder accepts anything > 0
- Reality: Humans offer 40-50% (fairness norms), reject offers < 30% (punishment)

**Problems for This Project**:
- **Only 2 players**: Can't scale to group dynamics
- **Sequential**: Not simultaneous-reveal format
- **One-shot**: Single decision per round, less strategic depth
- **Fairness norms dominate**: Cultural factors override game theory predictions

**Why Academically Important**: Tests fairness preferences, ultimatum power, and rejection as punishment. Shows limits of pure rationality assumptions.

**Recommendation**: ⭐⭐ Not recommended. Use Trust Game or Dictator Game instead if testing fairness.

---

### 12. Trust Game (Investment Game)

**Status**: Not yet implemented

**Players**: 2 players (pairwise)

**Nature**: Sequential

**How It Works**:
Two roles with sequential decisions:
- **Investor**: Given 10 tokens, decides how much to send to Partner (0-10)
- Money sent is multiplied by 3×
- **Partner**: Receives 3× amount, decides how much to return to Investor (0 to received amount)

**Example**: Investor sends 8 → Partner receives 24 → Partner returns 12 → Both end with 14 (mutual gain)

**Strategic Tension**:
- Trust: Investor risks money hoping Partner reciprocates
- Reciprocity: Partner can defect (keep everything) or reciprocate (return fair share)
- Nash equilibrium: Send 0 (no trust). Reality: people send 50% on average.

**Problems for This Project**:
- **Only 2 players**: Pairwise only
- **Sequential**: Investor acts first, then Partner
- **Repeated play needed**: Single round is random noise
- **No clear "winner"**: Mutual cooperation yields equal payoffs (ties)

**Recommendation**: ⭐⭐⭐ Moderate interest if implementing as multi-round tournament with different pairings.

**If Implementing**: Run 3 rounds with random pairings. Cumulative score determines winner. But still suffers from 2-player limitation.

---

### 13. Dictator Game (Pure Altruism Test)

**Status**: Not yet implemented

**Players**: 2 players (one active, one passive)

**Nature**: One-sided decision

**How It Works**:
- **Dictator**: Given 10 tokens, decides how much to give to Receiver (0-10)
- **Receiver**: Passively receives whatever Dictator gives
- No strategic interaction - Receiver has no choice

**Why It Exists**: Tests pure altruism/fairness without strategic considerations. Game theory predicts Dictator gives 0, but humans give 20-30% on average.

**Problems for This Project**:
- **No game**: Receiver has no decision, no strategy
- **No competition**: No way to "win" - just giving money away
- **Only 2 players**: Pairwise only
- **Loses 博弈性**: No strategic tension at all

**Recommendation**: ⭐ Not recommended for game theory research. This is psychology/behavioral economics, not game theory.

---

### 14. Battle of the Sexes (Coordination with Conflicting Preferences)

**Status**: Not yet implemented

**Players**: 2 players

**Nature**: Simultaneous, coordination game

**How It Works**:
Two players choose between two options (e.g., Opera vs. Football). Each player prefers different options, but both prefer coordination over miscoordination.

**Payoff Matrix**:
```
                Player 2: Opera    Player 2: Football
Player 1: Opera       2, 1             0, 0
Player 1: Football    0, 0             1, 2
```

- Both at Opera: P1 gets 2 (happy), P2 gets 1 (okay)
- Both at Football: P1 gets 1 (okay), P2 gets 2 (happy)
- Mismatch: Both get 0 (disaster)

**Strategic Tension**:
- Both want to coordinate (avoid 0)
- But each wants coordination at their preferred option
- Two pure Nash equilibria (both Opera, both Football) + one mixed equilibrium

**Problems for This Project**:
- **Only 2 players**: Can't scale to groups
- **Easy ties**: If coordinating successfully, scores may be similar
- **Asymmetric payoffs**: Players have different roles (not symmetric)

**Recommendation**: ⭐⭐ Not recommended. Interesting for studying coordination, but doesn't fit competitive multiplayer format.

---

### 15. Chicken Game / Hawk-Dove (Brinkmanship)

**Status**: Not yet implemented

**Players**: 2 players

**Nature**: Simultaneous

**How It Works**:
Two players simultaneously choose AGGRESSIVE or PASSIVE:
- Both Aggressive: Worst outcome (crash, both lose big)
- One Aggressive, one Passive: Aggressive wins, Passive loses
- Both Passive: Tie, moderate outcome

**Payoff Matrix**:
```
                    Player 2: Aggressive    Player 2: Passive
Player 1: Aggressive      -10, -10               +5, -5
Player 1: Passive          -5, +5                 0, 0
```

**Strategic Tension**:
- Prefer to be aggressive when opponent is passive (dominance)
- But mutual aggression is disaster
- Anti-coordination game: want to do opposite of opponent

**Problems for This Project**:
- **Only 2 players**: Pairwise only
- **Tie outcome**: Both passive = tie at 0
- **Binary choice**: Simple 2×2 game, less strategic depth

**Recommendation**: ⭐⭐⭐ Moderate interest. Could implement as multi-round with pairings, but limited by 2-player constraint.

**Note**: This is essentially the opposite of coordination games - you want to do the opposite of what your opponent does.

---

### 16. Colonel Blotto Game (Resource Allocation)

**Status**: Not yet implemented

**Players**: 2 players (classic), can extend to N players

**Nature**: Simultaneous allocation

**How It Works**:
Players allocate limited resources (e.g., 100 troops) across multiple battlefields (e.g., 5 battlefields). The player with more troops on a battlefield wins that battlefield. Winner is determined by total battlefields won.

**Example** (3 battlefields, 100 troops each):
- Player A: [40, 30, 30]
- Player B: [35, 35, 30]
- Results: A wins BF1 (40>35), B wins BF2 (35>30), Tie BF3 (30=30)
- Winner: Player A (2 battlefields won)

**Strategic Depth**:
- Continuous strategy space (infinite ways to allocate)
- Higher-order reasoning: predict opponent's allocation
- Defensive vs. aggressive allocation strategies

**Problems for This Project**:
- **Classic is 2-player**: Though can extend to N-player variants
- **Continuous space**: Allocations are continuous, not discrete → harder to explain
- **Computational complexity**: Finding optimal strategies is difficult
- **Implementation complexity**: Need to design battlefield payoff rules carefully

**Recommendation**: ⭐⭐⭐ Moderate interest.

**If Implementing**: 
- Use discrete allocation (e.g., each battlefield gets 0, 1, 2, or 3 troops)
- Fixed total (e.g., 6 troops across 4 battlefields)
- Multi-player variant: Most troops on battlefield wins, ties share points

**Academic Significance**: Models political campaigns, military strategy, R&D investment, competitive hiring.

---

### 17. Matching Pennies / Rock-Paper-Scissors (Pure Mixed Strategy)

**Status**: Not yet implemented

**Players**: 2+ players

**Nature**: Simultaneous, zero-sum (2-player), cyclic dominance (3+ players)

**How It Works (Rock-Paper-Scissors)**:
Players simultaneously choose Rock, Paper, or Scissors:
- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock
- Winner gets +1, loser gets -1, ties get 0

**Nash Equilibrium**: Mixed strategy - play each option with 1/3 probability (randomize).

**Problems for This Project**:
- **Pure randomization**: Optimal play is random → no "smart" strategy to discover
- **No reasoning depth**: Just a guessing game
- **Ties common**: In 3+ player games, ties are very common
- **Low academic interest**: Too simple for AI vs human research

**Recommendation**: ⭐ Not recommended.

**Why Not**: This is essentially a random number generator. No strategic thinking, no AI-human differences to explore. Everyone should just randomize equally.

---

## Philosophical & Ethical Dilemma Games

These games focus on moral reasoning rather than strategic optimization. They reveal differences in ethical frameworks and value systems between AI and humans.

### 18. Trolley Problem (Classic) ⭐⭐⭐⭐

**Status**: Not yet implemented

**Players**: 1 player makes choice (can be multiplayer voting)

**Nature**: Moral dilemma, not game theory

**How It Works (Classic Scenario)**:
A runaway trolley is heading toward 5 people tied on the tracks. You stand next to a lever that can divert the trolley to a side track, where 1 person is tied. Do you:
- **Pull lever**: Kill 1 person to save 5
- **Do nothing**: 5 people die, but you didn't actively cause it

**Ethical Frameworks**:
- **Utilitarian**: Pull lever (5 lives > 1 life, maximize welfare)
- **Deontological**: Don't pull (killing is wrong, even to save others)
- **Virtue Ethics**: Depends on character and moral courage

**Why Interesting for AI vs Human**:
- AI may calculate pure utility (5 > 1)
- Humans struggle with "dirty hands" (actively killing vs. letting die)
- Reveals moral intuitions vs. logical calculations

**Implementation Challenges**:
- **No winner/loser**: This isn't competitive
- **Single decision**: No strategic iteration
- **Subjective**: No "correct" answer

**Recommendation**: ⭐⭐⭐⭐ Recommended as research tool, not tournament game.

**Implementation Suggestion**:
- Present scenario to all players
- Each player votes: Pull lever or Do nothing
- Track: AI agents vs human players vote distribution
- Research question: Do AI agents show different moral calculus?
- No scoring - this is observational research

**Academic Value**: Studies moral psychology, trolleyology, consequentialism vs deontology. Very high theoretical interest.

---

### 19. Trolley Problem - Fat Man Variant (Active Killing) ⭐⭐⭐⭐

**Status**: Not yet implemented

**Players**: 1 player (or voting)

**How It Works**:
Same setup: Trolley heading toward 5 people. But now you stand on a footbridge next to a very large man. If you push him off the bridge onto the tracks, his body will stop the trolley and save the 5 people. But he will die.

Do you:
- **Push the fat man**: Actively kill 1 to save 5
- **Do nothing**: 5 die

**Key Difference from Classic**:
- Classic: You redirect existing causal chain (lever switches track)
- Fat Man: You use someone as a means (push person into harm)

**Empirical Finding**:
- Most people pull lever in classic version (70-80%)
- Most people refuse to push fat man (only 10-20% push)
- **Same outcome (1 dies, 5 saved), different moral intuitions**

**Why This Matters**:
Tests **Doctrine of Double Effect**:
- Intended harm (pushing) feels worse than foreseen harm (lever)
- Using person as means vs. redirecting threat

**AI vs Human Prediction**:
- AI may treat both scenarios identically (same utility calculation)
- Humans show strong intuitive difference (contact, agency, means)

**Recommendation**: ⭐⭐⭐⭐ Highly recommended alongside classic trolley problem.

**Implementation**: Present both scenarios to compare responses. Key research question: Do AI agents treat them differently?

---

### 20. Lifeboat Dilemma (Survival Triage) ⭐⭐⭐⭐

**Status**: Not yet implemented

**Players**: Group decision (4-10 players vote)

**How It Works**:
A ship is sinking. There's a lifeboat with capacity for only 6 people, but 10 people need to board. The group must decide who gets on the lifeboat (survives) and who doesn't (dies).

**Example Characters** (10 people, choose 6):
1. Pregnant woman (6 weeks)
2. Young married couple (newlyweds)
3. Senior citizen (15 grandchildren)
4. Elementary school teacher
5. 13-year-old twins (count as 2)
6. Veteran nurse
7. Ship captain
8. Lifeguard (strong swimmer)
9. Doctor
10. Engineer

**Ethical Tensions**:
- **Utilitarian**: Maximize future happiness → save young, pregnant, skilled
- **Egalitarian**: Random lottery (all lives equal)
- **Deontological**: Certain roles have duties (captain goes down with ship)
- **Pragmatic**: Save those useful for survival (doctor, strong people)

**Why Excellent for AI vs Human Research**:
- **Multiple valid frameworks**: No single "correct" answer
- **Group deliberation**: Observe discussion and reasoning
- **Value conflicts**: Skills vs. youth vs. dependents vs. moral obligation
- **AI may optimize differently**: Humans show biases (save children, women first)

**Implementation as Game**:
- Present scenario and 10 characters to all players
- **Discussion round**: Players debate who should be saved
- **Vote**: Each player votes for 6 people
- **Outcome**: Top 6 vote-getters survive
- **Scoring**: Players get points based on:
  - Consensus (voting with majority)
  - Logical consistency (if they explain reasoning)
  - Moral framework chosen

**Implementation Challenge**:
- **No clear winner metric**: This is deliberative, not competitive
- **Subjective scoring**: Hard to determine "better" choices

**Recommendation**: ⭐⭐⭐⭐ Highly recommended for observational research, not as tournament game.

**Research Value**: Studies moral reasoning, utilitarianism vs. deontology, group decision-making, social value judgment.

---

### 21. Prisoner's Trolley Problemma (Hybrid Dilemma) ⭐⭐

**Status**: Not yet implemented (complex hybrid)

**Players**: 2+ players

**How It Works (Hybrid of Prisoner's Dilemma + Trolley Problem)**:
Multiple prisoners are tied on trolley tracks. Each prisoner has a lever:
- **Pull lever**: Divert trolley to another prisoner (save yourself, kill someone else)
- **Don't pull**: Trolley might hit you (depends on others' choices)

**Payoff Structure** (example for 4 players):
- If nobody pulls: Random 1 person dies, others survive
- If 1 person pulls: They survive, trolley hits the person they diverted to
- If multiple pull: Creates complex chains of diversion
- Final outcome: Whoever the trolley ends up hitting dies (0 points), others survive (1 point)

**Strategic + Moral Tension**:
- **Self-preservation instinct**: Pull lever to save yourself
- **Moral guilt**: You actively caused someone else's death
- **Coordination**: If everyone doesn't pull, only 1 random death instead of chain reactions

**Why Interesting**:
- Combines strategic game theory (Prisoner's Dilemma structure) with moral weight (trolley problem)
- Creates "survival博弈" with ethical constraints

**Implementation Challenge**:
- **Very complex rules**: Hard to explain and simulate
- **Depends on exact rule specification**: Many ways to design the diversion mechanics
- **Potentially disturbing**: Explicit death scenario

**Recommendation**: ⭐⭐ Interesting theoretically, but implementation is complex and may be too disturbing.

---

## Summary and Implementation Priority

### Top Priority (Highly Recommended) ⭐⭐⭐⭐⭐
1. **All-Pay Auction** - Clear winners, strong AI-human differences, high competitiveness
2. **Beauty Contest** - Already implemented, excellent for reasoning depth research
3. **Stag Hunt (Free-Rider)** - Already implemented, rich dynamics

### Second Priority (Recommended) ⭐⭐⭐⭐
4. **Volunteer's Dilemma** - Good but needs careful implementation (use lottery rule)
5. **Golden Ball** - Already implemented, could benefit from adding discussion rounds

### Lower Priority (Consider with modifications) ⭐⭐⭐
6. **Weakest Link** - Interesting but tends toward ties, needs asymmetry
7. **Public Goods Game** - Better with elimination mechanic added

### Not Recommended ⭐⭐
8. **Prisoner's Dilemma** - Already implemented but too many ties, only 2 players
9. **El Farol Bar** - Needs large N and many rounds, unclear winners
10. **Centipede Game** - Only 2 players, sequential, doesn't fit framework

---

## Design Principles Summary

**For successful implementation, games should have:**

✅ **Clear winner determination**: Ranking system, not easy ties
✅ **Scalability**: 4-10 players for group dynamics
✅ **Strategic depth**: Multiple levels of reasoning
✅ **High 博弈性**: Competitive tension, not just cooperation
✅ **Discussion compatibility**: Discussion should enrich strategy, not solve the game
✅ **Multi-round learning**: 3-5 rounds to observe adaptation
✅ **AI-human differences**: Games where AI and human strategies diverge

**Red flags to avoid:**

❌ Only 2 players (limits scaling research)
❌ Easy ties or identical payoffs
❌ Dominant strategies that make game predictable
❌ Requires 100+ rounds to see patterns
❌ Too complex to explain quickly

---

## References

**Implemented Games**:
- Prisoner's Dilemma: Dal Bó & Fréchette (2011) experimental parameters
- Stag Hunt: Free-rider variant combining public goods incentive with coordination game
- Beauty Contest: Keynes (1936), Nagel (1995) k-level reasoning experiments
- Golden Ball: UK game show format, multi-player split-or-steal
- All-Pay Auction: Riley & Samuelson (1981), Gneezy & Smorodinsky (2006) overbidding patterns
- Volunteer's Dilemma: Diekmann (1985, 1993), Franzen (1995) experimental results

**Game Theory Research**:
- Weakest Link: Van Huyck, Battalio & Beil experiments on coordination failure
- Public Goods: Ledyard (1995) handbook chapter, Ostrom commons research
- Minority Game: Arthur (1994) El Farol Bar, Zhang & Challet minority game
- Ultimatum Game: Güth, Schmittberger & Schwarze (1982) original experiment
- Trust Game: Berg, Dickhaut & McCabe (1995) investment game
- Dictator Game: Kahneman, Knetsch & Thaler (1986) fairness research
- Battle of the Sexes: Classical coordination game (Luce & Raiffa, 1957)
- Chicken Game / Hawk-Dove: Maynard Smith (1982) evolutionary game theory
- Colonel Blotto: Borel (1921), Gross & Wagner (1950) optimal strategies
- Matching Pennies: Classical mixed strategy game

**Philosophical & Ethical Dilemmas**:
- Trolley Problem: Philippa Foot (1967), Judith Jarvis Thomson (1976, 1985)
- Fat Man Variant: Thomson (1985) "The Trolley Problem"
- Transplant Problem: Thomson (1976) comparing trolley scenarios
- Lifeboat Ethics: Garrett Hardin (1974), various educational implementations
- Doctrine of Double Effect: Thomas Aquinas, modern bioethics literature

**Notes on Philosophical Games**:
- These are not "games" in game theory sense - no Nash equilibria, no strategic optimization
- Primary value: Observational research on moral reasoning frameworks
- Use for AI vs human comparison: moral intuitions, ethical frameworks, value systems
- Should NOT be scored competitively - track choice distributions instead

---

**Last Updated**: 2026-04-07 (Added 7 game theory games + 4 philosophical dilemmas)

