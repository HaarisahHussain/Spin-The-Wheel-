export default function GameShell({
  icon: Icon,
  title,
  eyebrow,
  players,
  children,
  accent = "indigo",
}) {
  return (
    <div className="w-full max-w-6xl">
      <div className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div
            className={`text-sm uppercase tracking-[.35em] ${{ indigo: "text-indigo-300", cyan: "text-cyan-300", yellow: "text-yellow-300" }[accent]} font-black mb-2`}
          >
            {eyebrow}
          </div>
          <div className="flex items-center gap-4">
            <div className="game-icon">
              <Icon size={34} />
            </div>
            <h2 className="text-5xl font-black tracking-tight">{title}</h2>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {players.map((p) => (
            <span
              key={p.playerId}
              className="px-4 py-2 rounded-full bg-white/8 border border-white/10 text-sm font-bold"
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
