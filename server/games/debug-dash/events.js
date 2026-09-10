import { debugLevel } from "../data.js";

export function handleEvent({ session, player, data, payload, engine }) {
  const { finishActiveGroup } = engine;

  if (payload.action !== "DEBUG_LINE") return;
  if (data.completed) return;
  const clicked = payload.line;
  if (
    !Number.isInteger(clicked) ||
    clicked < 0 ||
    clicked >= data.code.split("\n").length
  )
    return;
  if (clicked === data.targetLine) {
    data.scores[player.id] = (data.scores[player.id] || 0) + data.level * 100;
    if (data.level >= 4) {
      data.completed = true;
      data.status = "SUCCESS";
      data.message = `${player.name} cleared the boss level!`;
      finishActiveGroup(session, {
        score: data.scores[player.id],
        scores: data.scores,
      });
      return;
    }
    data.level += 1;
    const next = debugLevel(data.level, data);
    if (!next) {
      data.completed = true;
      data.status = "SUCCESS";
      data.message = `${player.name} cleared the final level!`;
      finishActiveGroup(session, {
        score: data.scores[player.id],
        scores: data.scores,
        reason: "COMPLETED",
      });
      return;
    }
    data.targetLine = next.targetLine;
    data.code = next.code;
    data.message = next.message;
  } else {
    data.scores[player.id] = Math.max(0, (data.scores[player.id] || 0) - 50);
    data.message = "Bug got you — debugging is a skill you learn!";
  }
}
