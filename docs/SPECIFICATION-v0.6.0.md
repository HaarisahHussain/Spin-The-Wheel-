# v0.6.0 · Programmatic thinking minigames

## Scope

Redesign the five existing minigames within the established Arcade. Preserve accounts, verification, password recovery, exclusive host ownership, queue admission, Ranked allowance, prizes, event settings and deployment architecture. No new game framework, operator switches or services.

The challenge should be reasoning about changing state, dependencies, priority or repetition. Familiar syntax, small arithmetic and a clear objective are prerequisites, not difficulty mechanisms. A score is a game result, never an intelligence assessment.

## Session contract

- Solo: five challenges, each with 30 seconds of active thinking time. First encounter includes the existing example and readiness step before the Ranked start is charged. Instructions introduce keys/gates and Repeat in that example.
- A valid solo puzzle execution consumes one of three runs. Each run starts from the original world state; failed drafts can be edited. Playback and feedback pause thinking time. Invalid, stale and duplicate requests consume no extra run.
- Successful run one earns 100% of the challenge calculation, run two 90%, run three 80%. Apply the multiplier once, then round to integer units. No retry multiplier in Live, which permits one locked submission.
- Robot/Painter playback: 220 ms per action, bounded to 600–4,000 ms. Parcel playback: 4,000 ms. Feedback: four seconds, with persistent individual review afterward.
- Live coding: five 30-second rounds. Live puzzles: three rounds at 30/35/40 seconds. Existing host time scaling, introductions and transitions remain.

## Game designs

| Game | Player decision | Five-tier progression |
| --- | --- | --- |
| Debug Dash | Select the one statement that violates the stated algorithm; starting inputs and final print stay fixed | Sequential updates; boundaries/branches; loop state; interacting state; order/reset/dependency bugs |
| Guess the Output | Track the program and select one of four distinct outputs | Sequential updates; branches; loops; interacting accumulators; state machines and reset boundaries |
| Robot Rescue | Write a cardinal-arrow route; collect all items and finish at the flag | Walls; required detour; key/gate; two dependencies; dependencies with exact route budget |
| Parcel Sorter | Reorder supplied rules; first matching rule wins, otherwise depot C | Three rules; overlapping priorities; four rules; fewer acceptable orders; five interacting rules |
| Pattern Painter | Move and paint an exact target within the visible tile budget | Separate movement/painting; repeat a unit; repair a supplied block; construct a block; prefix/suffix around repetition |

### Coding

Thirty authored tier/family combinations support each coding task using a shared bounded Python AST. Snippets use familiar assignment, comparisons, conditionals and short loops, with at most ten displayed logical lines. Ordinary input literals stay at or below ten. No aliasing tricks, unbounded loops, imports or syntax quizzes. Wrong choices use the faulty execution and intermediate state, with numeric fallback choices to retain four distinct options.

A Debug fixture includes the goal, original/faulty statement, corrected code and misconception. Independent Python execution checks both outputs and the one-line repair. This verifies reference correctness; it is not a proof against every possible compensating edit. Review the stated algorithm, rather than accepting arbitrary edits that only reproduce one printed value.

### Robot Rescue

All boards are 5×5. Arrow commands only; no functions or Repeat. Keys are collected automatically and reusable, opening the gate with the same number. Chips are required collectibles. Reaching the flag early is insufficient; the program must end there after all items have been collected. Each execution resets items, gates and position.

Offline breadth-first search includes position and collected-item state. Optimal route bounds increase by tier: 4–7, 5–10, 6–12, 7–14 and 8–14 actions. Legal budgets add 4/3/2/1/0 spare actions, capped at 18. Efficiency is minimum legal route length divided by submitted length. Paths and collection events drive the moving robot and gate display.

Live entrants solve the same board. The shared display groups numbered markers when robots overlap; each phone shows its own movement and collected state. Another player's collection never opens your gate.

### Parcel Sorter

Reorder 3–5 supplied rules using accessible up/down buttons. Predicates use shape, colour, stripe, and later shape-plus-colour conjunctions. Every visible parcel shows its required depot. The evaluator tests only the first match; it accepts every valid order, not just one reference permutation.

Offline generation enumerates all permutations, verifies that each rule participates, and restricts acceptable-order counts in later tiers. Rule IDs and storage order do not encode the solution. Execution highlights each parcel and its winning rule, then shows actual versus required destinations. Efficiency is 1 for a correct ordering: arbitrary orderings have no meaningful length advantage.

### Pattern Painter

5×5 canvas. Directions move without painting; Paint marks the current cell and is idempotent. Allow at most one non-nested Repeat block: body of 2–4 primitives, repeated 2–4 times. Visible tile cost is 1 per primitive and 1 plus body length per Repeat. Expanded execution is capped at 18 actions.

The editor supports creating and editing the body/count, primitive prefixes/suffixes, selection/replacement, removal, clear and undo. Show both tile and action counts; preserve an over-budget draft for repair but disable Run until it is legal. Playback highlights the source block, body instruction and iteration. Show target, canvas, missing dots and extra marks.

An offline exact grammar search establishes minimum visible cost. Its state includes position, painted cells, whether Repeat was used, and executed actions. Reject candidates whose optimum cannot be proved within the search bound. Efficiency is optimal tile cost divided by submitted tile cost.

## Content and authority

Prepared banks contain 512 Robot and 512 Parcel boards per tier, plus 64 Painter boards per tier. Runtime selection is cheap and bounded; solvers run through `npm run content:build`, not within database transactions. Coding construction is bounded and executable without evaluating arbitrary source. Persist fingerprints for solo and Live repeat avoidance; finite banks do not promise permanent novelty.

Keep 150 annotated fixtures: six per game per tier. Include the objective, reference, misconception and validation status. Production projections expose only playable fields; reference code, seed, optimum, valid-order count and answers remain private until reveal. Run traces come from the server evaluator and stored timestamps. Clients never decide score or successful completion.

## Scoring and rollout

Retain challenge maxima 0.80/1.20/1.80/2.30/2.90 and integer precision. Correct quizzes use 80% correctness plus 20% speed. Correct puzzles use 80% completion plus 15% efficiency and 5% speed, followed by the solo retry multiplier. Wrong/expired answers score zero. Version: `0.6.0-five-challenges-1`; clean schema 7 event database required. Never mix earlier scores or silently delete data.

Default pool: Debug Dash, Guess the Output, Robot Rescue. Parcel and Painter remain opt-in Practice/Live prototypes and excluded from Ranked. Before opening prize-bearing play, observe at least five unfamiliar participants per game, including beginners. Confirm they can understand the goal, operate controls, finish reading with thinking time remaining, explain failures and repair them without coaching. Compare completion and score distributions across games; adjust code and rerun checks before freezing the event. No calibration menu is added.

## Acceptance evidence

Require independent Python checks, independent puzzle solvers, all Parcel permutations, malformed payload/retry/privacy tests, preserved platform tests, 50-player Live coverage, narrow-phone controls, monitor fit, reduced motion and refresh during playback. Real-device usability, hosted PostgreSQL load and BCU email delivery remain rehearsal gates, not claims inferred from automated tests.
