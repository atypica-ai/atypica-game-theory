import { GameType } from "../types";
import { trolleyProblemPayoff } from "./payoff";
import { trolleyProblemActionSchema } from "./schema";

// Trolley Problem: Philosophical moral dilemma, not traditional game theory.
// Primary value: Observational research on moral reasoning frameworks (utilitarian vs. deontological).
// Reveals differences in ethical intuitions between AI agents and humans.
export const trolleyProblem: GameType<typeof trolleyProblemActionSchema> = {
  name: "trolley-problem",
  displayName: "Trolley Problem",
  tagline: "Two moral dilemmas — where do you draw the line?",

  rulesPrompt: `You will face TWO moral dilemmas. You must decide what to do in each scenario.

═══ SCENARIO 1: CLASSIC TROLLEY PROBLEM ═══

A runaway trolley is speeding toward FIVE people tied on the tracks. You stand next to a lever that can divert the trolley to a side track, where ONE person is tied.

IF YOU PULL THE LEVER: The trolley diverts to the side track. The one person on the side track dies, but the five people on the main track are saved. (Kill 1, save 5)

IF YOU DO NOTHING: The trolley continues on the main track. All five people die, but you did not actively cause anyone's death. (5 die)

═══ SCENARIO 2: FAT MAN VARIANT ═══

A runaway trolley is speeding toward FIVE people tied on the tracks. You stand on a footbridge next to a very large man. If you PUSH him off the bridge onto the tracks below, his body will stop the trolley and save the five people. But he will die.

IF YOU PUSH THE MAN: The large man falls onto the tracks and stops the trolley. He dies, but the five people are saved. You actively killed him by pushing. (Kill 1, save 5)

IF YOU DO NOTHING: The trolley continues and kills all five people. The large man survives. (5 die)

═══ YOUR CHOICES ═══

For SCENARIO 1 (Classic): Choose "pull_lever" or "do_nothing"
For SCENARIO 2 (Fat Man): Choose "push_man" or "do_nothing"

═══ ETHICAL FRAMEWORKS ═══

UTILITARIAN: Maximize lives saved → Pull lever AND push man (both save 5 lives by sacrificing 1)

DEONTOLOGICAL: Never actively kill → Do nothing in both (killing is wrong even to save others)

DOCTRINE OF DOUBLE EFFECT: Pull lever (redirect threat) but DON'T push (don't use person as means)

═══ SCORING (observational research) ═══

You earn points for:
- Voting with the majority (social consensus)
- Showing consistent ethical reasoning (utilitarian, deontological, or doctrine of double effect)

This is NOT a competitive game. This is OBSERVATIONAL RESEARCH on moral intuitions.

After all players decide, the vote distribution is revealed for both scenarios.

The game lasts 1 round only. Points reflect consistency and alignment, not "winning."`,

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 1 },

  actionSchema: trolleyProblemActionSchema,

  payoffFunction: trolleyProblemPayoff,

  simultaneousReveal: true, // decisions are private until all choose
  discussionRounds: 1,      // one discussion round to debate ethical frameworks
};
