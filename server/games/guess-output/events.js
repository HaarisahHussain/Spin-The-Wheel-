import { guessLevel } from "../data.js";

export function handleEvent({ session, player, data, payload, engine }) {
  const { finishActiveGroup } = engine;

  if (payload.action === "BUZZ") {
    if (!data.buzzedBy) data.buzzedBy = player.id;
  }
  if (payload.action === "ANSWER") {
    if (
      (data.mode === "Single Player" || data.buzzedBy === player.id) &&
      Array.isArray(data.options) &&
      data.options.includes(payload.answer)
    ) {
      const correct = payload.answer === data.correctAnswer;
      data.selected = payload.answer;
      data.lastAnswerCorrect = correct;
      if (correct) {
        data.scores[player.id] = Math.max(
          0,
          (data.scores[player.id] || 0) + data.level * 100,
        );
        data.message = `${player.name} got it right! +${data.level * 100}`;
        data.buzzedBy = null;
        if (data.level >= 4) {
          data.completed = true;
          data.status = "SUCCESS";
          finishActiveGroup(session, {
            score: data.scores[player.id],
            scores: data.scores,
            reason: "COMPLETED",
          });
          return;
        }
        data.level += 1;
        const next = guessLevel(data.level, data);
        if (!next) {
          data.completed = true;
          data.status = "SUCCESS";
          finishActiveGroup(session, {
            score: data.scores[player.id],
            scores: data.scores,
            reason: "COMPLETED",
          });
          return;
        }
        data.question = next.question;
        data.options = next.options;
        data.correctAnswer = next.correctAnswer;
        data.selected = null;
        data.lastAnswerCorrect = null;
        data.message =
          data.mode === "Single Player"
            ? `Level ${data.level} — choose your answer`
            : `Level ${data.level} — buzz in!`;
      } else {
        // Wrong answers are verified immediately, cost 50, but never make
        // the player's score negative. In multiplayer the buzzer opens again.
        data.scores[player.id] = Math.max(
          0,
          (data.scores[player.id] || 0) - 50,
        );
        data.message = `${player.name} missed it. Try again.`;
        data.buzzedBy = null;
      }
    }
  }
}
