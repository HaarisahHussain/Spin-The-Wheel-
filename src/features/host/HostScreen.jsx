import { QRCodeSVG } from "qrcode.react";
import {
  ExternalLink,
  Wifi,
  Users,
  Gamepad2,
  Play,
  Square,
  RotateCcw,
} from "lucide-react";

import AmbientMusic from "../../components/AmbientMusic.jsx";
import { useHostSession } from "./useHostSession.js";

export default function HostScreen() {
  const { session, state, error, busy, openMonitor, hostEvent } =
    useHostSession();
  const queue = state?.queue || [];
  const active = state?.activeGroup;

  return (
    <div className="min-h-screen bg-[#070913] text-white flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#11142b]/95 border border-slate-800 rounded-3xl p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-indigo-300">
              Host Control
            </div>
            <h1 className="text-4xl font-black">Spin The Wheel</h1>
          </div>
          <div className="flex items-center gap-3">
            <AmbientMusic />
            <button
              onClick={openMonitor}
              disabled={!session}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold flex items-center gap-2"
            >
              <ExternalLink size={18} /> Open Monitor Display
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="text-center">
            {session?.mobileUrl ? (
              <div className="bg-white p-6 rounded-3xl inline-block">
                <QRCodeSVG value={session.mobileUrl} size={300} level="H" />
              </div>
            ) : (
              <div className="w-[348px] max-w-full aspect-square rounded-3xl border border-slate-700 bg-slate-900/70 inline-grid place-items-center p-8">
                <div>
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-slate-700 border-t-indigo-400 animate-spin" />
                  <p className="text-slate-300 font-bold">Creating session…</p>
                  <p className="text-slate-500 text-sm mt-2">
                    The QR code will appear when it is ready.
                  </p>
                </div>
              </div>
            )}
            <h2 className="text-3xl font-black mt-6">
              {session ? "Scan to Join" : "Please wait"}
            </h2>
            <p className="text-slate-400 mt-2">
              {session
                ? "This QR stays active so new players can join at any time."
                : "Do not scan until the session is live."}
            </p>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl bg-white/5 border border-slate-800 p-5">
              <div
                className={`flex items-center gap-2 font-bold ${session ? "text-emerald-300" : "text-slate-400"}`}
              >
                <Wifi size={18} />{" "}
                {session ? "Session live" : "Starting session"}
              </div>
              <div className="text-xs text-slate-400 mt-2 font-mono">
                {session?.sessionId || "Starting…"}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} />
                <span className="font-bold">
                  Waiting queue ({queue.length})
                </span>
              </div>
              {queue.length ? (
                <div className="space-y-2">
                  {queue.map((p) => (
                    <div
                      key={p.playerId}
                      className="flex justify-between bg-slate-900/70 rounded-xl p-3 text-sm"
                    >
                      <span>
                        #{p.position} {p.name}
                      </span>
                      <span className="text-indigo-300">
                        {p.game} · {p.mode}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">
                  {session
                    ? "No one waiting. The QR is ready for the next player."
                    : "The waiting queue will open with the session."}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-indigo-600/10 border border-indigo-500/20 p-5">
              <div className="flex items-center gap-2 font-bold">
                <Gamepad2 size={18} />{" "}
                {active ? `Playing: ${active.game}` : "Main screen available"}
              </div>
              <p className="text-slate-400 text-sm mt-2">
                {active
                  ? "New players can still scan the QR and join another queue."
                  : "Single-player games can start automatically. Multiplayer waits for the host."}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-slate-800 p-5">
              <div className="font-bold mb-3">Host Controls</div>
              <div className="space-y-3">
                {(state?.groups || [])
                  .filter((g) => g.mode === "Multiplayer")
                  .map((g) => (
                    <div
                      key={g.key}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/70 p-3"
                    >
                      <div>
                        <div className="text-sm font-bold">{g.game}</div>
                        <div className="text-xs text-slate-500">
                          {g.players.length} players ·{" "}
                          {g.ready ? "Ready" : "Need 2 players"}
                        </div>
                      </div>
                      <button
                        disabled={!g.ready || !!active || busy}
                        onClick={() =>
                          hostEvent("START_MULTIPLAYER", { key: g.key })
                        }
                        className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center gap-1 disabled:opacity-40"
                      >
                        <Play size={13} /> Start
                      </button>
                    </div>
                  ))}
                {!(state?.groups || []).some(
                  (g) => g.mode === "Multiplayer",
                ) && (
                  <p className="text-xs text-slate-500">
                    Multiplayer groups will appear here when players join.
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    disabled={!active || active.mode !== "Multiplayer" || busy}
                    onClick={() => hostEvent("END_MULTIPLAYER")}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-black flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <Square size={13} /> End multiplayer
                  </button>
                  <button
                    disabled={!!active || busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Reset the current server session? This clears the queue and active game.",
                        )
                      )
                        hostEvent("RESET_SERVER");
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-black flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <RotateCcw size={13} /> Reset server
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {error && <div className="mt-4 text-amber-300 text-sm">{error}</div>}
    </div>
  );
}
