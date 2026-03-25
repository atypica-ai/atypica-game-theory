i am building a branch project from atypica, that simulates game theory games with persona, pretty much alike panel and discussion feature in atypica. explore these two feature if you know not enough. the reason why I branch off a new project instead of building upon atypica is, atypica codebase is too heavy now. but I am also afraid off starting anew will cost time and effort building a lot of infrastructures that atypica already has. So I cloned the main branch of atypica and named it '/Users/tezign/Documents/PRJ/demo/atypica-game-theory'. my plan is to build on it as it is, with env and everything the same, db as well. since atypica cannot be forked, I will create a new repo and change the origin, then push, so the git is new. once the feature is built, we start pruning unnessesary things, schema, features, etc.. 
so now, please first explore the necessary features in this copied codebase of atypica directly. you should not need to reference back to the old codebase, since both are on the same commit. 
about the new project, our v0 stage goal is to present: 1. personas complete game theory games (like prisoner dilemma). to do so, we apply the current discussion backend feature of atypica with some tweaks. 
to idenify the tweaks, we need to define what is a game theory game: 
1. The Players definition establishes N agents who each have a goal (maximize their own payoff, or some more complex objective). This is what separates game theory from optimization — there are multiple decision-makers whose choices interact. For your backend, each Player slot is filled by a Persona with a rich description that shapes how they reason in steps 2 and 3.
2. The Rules are the natural language description of the situation — the "story" that frames the strategic interaction. This is what you give to each Persona as context. It must describe what's at stake, who the other players are (or how many), and what the action space is.
3. The Payoff function is the mathematical heart. It maps the combination of all players' actions in a round to a specific reward value for each player. This is non-negotiable — without a payoff function that depends on what others do, you don't have a strategic game, you have N separate individual decisions.
in other words without those it will not be a valid game theory games.
the way we implement any game theory game will through those. 1. game rule description prompt(exactly what the initial query question in the dicussion feature); 2. payoff function involves a) tool schema (restricts the actions every participants can act every round) b) a function that calculates payoff/reward, variables linked with the schema inputs c) Horizon / termination condition (eg. Fixed rounds, trigger condition,or indefinite with discount) 3. a interval of [N-M] number of participants; this "schema" defines a "gameType"(eg. "Prisoner Dilemma")
aside from these, to enable persona participants to see N other participants actions and words, and also allow us to control what can be seen what cannot be seen by different roles(thoughts cannot be seen, words and actions can be seen, rule can be seen, so on.), a single standard of truth just like timeline in dicussion should be constructed. the schema of this timeline instance needs to be loose: 1. game-wise 公告; 2. round-wise 公告； 3. player-wise thoughts, speech, action. so it should be like:
```json
{
    "meta": <game-wise meta, include participant ids, etc.>,
    "system": <game-wise 公告>,
    "rounds": [
        {
            "round-id": <int>,
            "timeline": [
                "system": <str: round-wise 公告>,
                "player_A": {
                    "thoughts": <str:nullable>,
                    "words": <str:nullable>,
                    "actions": [<tool-call-input, just use the part transfered by the model: not nullable>]
                },
                "player_B": ..
            ]
        },
        ..
    ]
}
```
but in db schema dont restrict this hard, just json, because we may change in the future. this thing defines a "game" instance, with this, we can do anything, we can parse it and put in each persona model's messages to control what they see; we can summarize it with a model to summarize the game; we can calculate player-wise, round-wise, game-wise rewardl; etc.. very similar to atypica discussion's timeline.
your job is to explore the relevant atypica original features, and plan on this new feature. dont think about pruning yet. plan in a maintainable, simple (straightforward not lazy), elegant way. location be in `src/app/(game-theory)`. for function and feature names, you can create as you wish.