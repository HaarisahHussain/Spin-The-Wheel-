import React from 'react';
import { Terminal, Bot, Code2, Zap, Clock3, Trophy, Volume2 } from 'lucide-react';

export default function PublicGame({ game, gameData, players = [] }) {
  if (game === 'Debug Dash') return <DebugDashPublic gameData={gameData} players={players} />;
  if (game === 'Robot Rescue') return <RobotRescuePublic gameData={gameData} players={players} />;
  return <GuessOutputPublic gameData={gameData} players={players} />;
}

const panel = 'rounded-[28px] border border-white/10 bg-[#090d22]/90 shadow-[0_20px_80px_rgba(0,0,0,.35)]';

function GameShell({ icon: Icon, title, eyebrow, players, children, accent = 'indigo' }) {
  return <div className="w-full max-w-6xl">
    <div className="flex items-end justify-between gap-6 mb-7">
      <div><div className={`text-sm uppercase tracking-[.35em] text-${accent}-300 font-black mb-2`}>{eyebrow}</div><div className="flex items-center gap-4"><div className="game-icon"><Icon size={34}/></div><h2 className="text-5xl font-black tracking-tight">{title}</h2></div></div>
      <div className="flex gap-2 flex-wrap justify-end">{players.map(p => <span key={p.playerId} className="px-4 py-2 rounded-full bg-white/8 border border-white/10 text-sm font-bold">{p.name}</span>)}</div>
    </div>
    {children}
  </div>;
}

function DebugDashPublic({ gameData, players }) {
  const code = gameData?.code || 'function add(a, b) {\n  return a + 1;\n}';
  const lines = code.split('\n');
  const level = gameData?.level || 1;
  return <GameShell icon={Terminal} title="Debug Dash" eyebrow={`Level ${level} · Find the bug`} players={players}>
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div className={panel + ' p-6'}>
        <div className="flex justify-between items-center mb-5"><span className="text-slate-300 font-bold">Spot the broken line</span><Timer seconds={gameData?.timeLimit ?? 25} startedAt={gameData?.startedAt}/></div>
        <div className="code-editor-public">{lines.map((line, i) => <div key={i} className="code-line"><span>{String(i + 1).padStart(2, '0')}</span><code>{line || ' '}</code></div>)}</div>
        <div className="mt-5 text-center text-slate-400">Choose the line on your phone. Correct answers unlock the next level.</div>
      </div>
      <ScoreBoard players={players} scores={gameData?.scores}/>
    </div>
  </GameShell>;
}

function RobotRescuePublic({ gameData, players }) {
  const robot = gameData?.robot || 0;
  const path = gameData?.path || [];
  const program = gameData?.program || [];
  const obstacles = gameData?.obstacles || [];
  const labels = { forward: 'MOVE FORWARD', left: 'TURN LEFT', right: 'TURN RIGHT' };
  const facing = ['NORTH', 'EAST', 'SOUTH', 'WEST'][gameData?.orientation ?? 1];
  return <GameShell icon={Bot} title="Robot Rescue" eyebrow={`Level ${gameData?.level || 1} · Program the robot · 35 seconds`} players={players} accent="cyan">
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div className={panel + ' p-7'}>
        <div className="robot-heading mb-5"><span className="text-slate-300 font-bold">START → FINISH</span><div className="flex gap-3 items-center"><span className="robot-orientation">Facing {facing}</span><Timer seconds={gameData?.timeLimit ?? 35} startedAt={gameData?.startedAt}/></div></div>
        <div className="robot-grid">{Array.from({length: 25}).map((_, i) => <div key={i} className={`robot-cell ${path.includes(i) ? 'visited' : ''} ${i === robot ? 'robot-cell-active' : ''} ${i === 24 ? 'finish-cell' : ''} ${obstacles.includes(i) ? 'robot-obstacle' : ''}`}>{i === robot ? <Bot size={42} className="text-cyan-300 robot-bob"/> : i === 24 ? '🏁' : obstacles.includes(i) ? '✦' : ''}</div>)}</div>
        <div className="robot-program">{program.length ? program.map((cmd, i) => <span className="command-block run" key={`${cmd}-${i}`}>{i + 1}. {labels[cmd]}</span>) : <span className="text-slate-500 text-sm">Waiting for the player's command blocks…</span>}</div>
        <div className="flex flex-wrap gap-3 mt-5 justify-center text-sm font-bold text-slate-300"><span>✦ Obstacles</span><span>{gameData?.executing ? '🤖 Robot running!' : 'Build → Run'}</span></div>
      </div>
      <ScoreBoard players={players} scores={gameData?.scores}/>
    </div>
  </GameShell>;
}

function GuessOutputPublic({ gameData, players }) {
  const options = gameData?.options || ['A) 2', 'B) 22', 'C) 4', 'D) Error'];
  const selected = gameData?.selected;
  return <GameShell icon={Code2} title="Guess The Output" eyebrow="Buzzer round · First to answer" players={players} accent="yellow">
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div className={panel + ' p-7'}>
        <div className="flex items-center justify-between mb-5"><div className="flex gap-3 items-center text-yellow-300 font-black"><Zap size={22}/> BUZZER LIVE</div><Timer seconds={gameData?.timeLimit ?? 25} startedAt={gameData?.startedAt}/></div>
        <pre className="code-challenge">{gameData?.question || "console.log(2 + '2');"}</pre>
        <div className="grid grid-cols-2 gap-4 mt-5">{options.map(opt => <div key={opt} className={`answer-card ${selected === opt ? 'answer-card-selected' : ''}`}>{opt}</div>)}</div>
        {gameData?.buzzedBy && <div className="mt-5 rounded-2xl bg-yellow-400/10 border border-yellow-300/20 px-5 py-4 text-yellow-200 font-bold">⚡ {gameData.buzzedBy} has first crack at it!</div>}
      </div>
      <ScoreBoard players={players} scores={gameData?.scores}/>
    </div>
  </GameShell>;
}

function Timer({ seconds = 0, startedAt }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const live = startedAt ? Math.max(0, seconds - (now - startedAt) / 1000) : seconds;
  return <div className={`timer-pill ${live <= 5 ? 'timer-danger' : ''}`}><Clock3 size={18}/>{Math.ceil(live)}s</div>;
}
function ScoreBoard({ players, scores = {} }) { return <div className={panel + ' p-6 h-fit'}><div className="flex items-center gap-2 text-emerald-300 font-black uppercase tracking-widest text-xs mb-5"><Trophy size={18}/> Live leaderboard</div><div className="space-y-3">{players.map((p, i) => <div key={p.playerId} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"><span className="font-bold"><span className="text-slate-500 mr-2">#{i+1}</span>{p.name}</span><strong>{scores[p.playerId] || 0}</strong></div>)}</div><div className="mt-6 text-xs text-slate-500 flex items-center gap-2"><Volume2 size={14}/> Sound + celebration on success</div></div>; }
