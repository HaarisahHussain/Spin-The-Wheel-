import { Trophy } from "lucide-react";

import { PANEL_CLASS } from "../lib/styles.js";

export default function ScoreBoard({ players, scores = {} }) {
  return (
    <div className={PANEL_CLASS + " p-6 h-fit"}>
      <div className="flex items-center gap-2 text-emerald-300 font-black uppercase tracking-widest text-xs mb-5">
        <Trophy size={18} /> Live leaderboard
      </div>
      <div className="space-y-3">
        {[...players]
          .sort((a, b) => (scores[b.playerId] || 0) - (scores[a.playerId] || 0))
          .map((p, i) => (
            <div
              key={p.playerId}
              className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
            >
              <span className="font-bold">
                <span className="text-slate-500 mr-2">#{i + 1}</span>
                {p.name}
              </span>
              <strong>{scores[p.playerId] || 0}</strong>
            </div>
          ))}
      </div>
    </div>
  );
}
