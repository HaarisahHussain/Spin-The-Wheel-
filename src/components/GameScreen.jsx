import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Bot, Code2, RotateCw, User, Users, Wifi, WifiOff, CheckCircle, Zap, ArrowUp, ArrowDown, CornerUpLeft, CornerUpRight, Clock3 } from 'lucide-react';
import Wheel from './Wheel';

export default function GameScreen({ sessionId }) {
  const [step, setStep] = useState(2);
  const [conn, setConn] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const playerIdRef = useRef('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [study, setStudy] = useState('');
  const [interests, setInterests] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [mode, setMode] = useState('Multiplayer');
  const [queue, setQueue] = useState([]);
  const [spin, setSpin] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [result, setResult] = useState(null);
  const gameDataRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    let s; let cancelled = false;
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      s = io(window.location.origin, { transports: ['websocket', 'polling'], reconnection: true });
      setConn(s);
      s.on('connect', () => s.emit('player:join', { sessionId }, r => {
        if (!r?.ok) setError(r?.error || 'Could not join session.');
        else { setPlayerId(r.playerId); playerIdRef.current = r.playerId; setError(''); }
      }));
      s.on('connect_error', () => setError('Cannot reach the laptop. Make sure the phone is on the same Wi-Fi.'));
      s.on('disconnect', () => setError('Connection lost. Trying to reconnect…'));
      s.on('session:state', state => {
      setQueue(state.queue || []);
      const currentPlayerId = playerIdRef.current;
      // Each phone only receives/animates its own wheel state. This prevents
      // another player's simultaneous spin from overwriting this screen.
      const ownWheel = state.wheelByPlayer?.[currentPlayerId] || (state.wheel?.playerId === currentPlayerId ? state.wheel : null);
      if (ownWheel) setSpin(ownWheel);
      const ownData = state.gameDataByPlayer?.[currentPlayerId] || (state.gameData?.game ? state.gameData : null);
      if (ownData?.game) { setGameData(ownData); gameDataRef.current = ownData; }
      if (state.activeGroup?.players?.some(p => p.playerId === currentPlayerId) && state.publicPhase?.game) setSelectedGame(state.publicPhase.game);
      const iAmActive = state.activeGroup?.players?.some(p => p.playerId === currentPlayerId);
      const iAmFinished = state.publicPhase?.finishedPlayers?.some(p => p.playerId === currentPlayerId);
      if (iAmActive && state.publicPhase?.type === 'GAME') setStep(7);
      if (iAmFinished && state.publicPhase?.type === 'RESULTS') {
        setResult(state.publicPhase);
        setGameData(null);
        setStep(8);
      }
      });
      s.on('session:command', msg => {
      if (msg.type === 'SPIN_STARTED') { setSpin(msg.payload); setStep(4); }
      if (msg.type === 'SPIN_COMPLETE') { setSpin(prev => ({ ...prev, ...msg.payload, active: false, finishedAt: Date.now() })); setSelectedGame(msg.payload.game); setStep(5); }
      if (msg.type === 'GAME_ANNOUNCEMENT') { setSelectedGame(msg.payload.game); }
      if (msg.type === 'START_GAME') { setSelectedGame(msg.payload.game); setStep(7); }
      if (msg.type === 'SERVER_RESET') { setResult(null); setGameData(null); setSelectedGame(''); setMode('Multiplayer'); setInterests([]); setStep(2); }
      });
    });
    return () => { cancelled = true; s?.disconnect(); };
  }, [sessionId]);

  const emit = (type, payload = {}) => { if (!conn?.connected) { setError('Not connected to the laptop.'); return false; } conn.emit('player:event', { type, payload }); return true; };
  const toggleInterest = interest => setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  const submitForm = e => { e.preventDefault(); if (!name.trim() || !study.trim()) return; if (emit('FORM_SUBMITTED', { name: name.trim(), study: study.trim(), interests })) setStep(3); };
  const showWheel = () => { if (emit('SHOW_WHEEL')) setStep(4); };
  const spinWheel = () => { if (spin?.active) return; emit('SPIN_REQUEST'); };
  const joinQueue = () => { if (emit('JOINED_QUEUE', { mode })) setStep(6); };
  const finish = score => { emit('GAME_FINISHED', { score }); setGameData(null); };
  const gameEvent = payload => { const next = { ...(gameDataRef.current || {}), ...payload }; gameDataRef.current = next; setGameData(next); emit('GAME_EVENT', payload); };
  const spinAgain = () => { setResult(null); setSelectedGame(''); setStep(4); emit('SHOW_WHEEL'); };
  const exitToForm = () => { setResult(null); setGameData(null); setSelectedGame(''); setMode('Multiplayer'); setInterests([]); setStep(2); emit('RESET_PLAYER'); };

  return <div className="phone-shell">
    {error && <div className="phone-error"><WifiOff size={14}/>{error}</div>}
    {conn?.connected && !error && <div className="sync-pill"><Wifi size={12}/> Synced</div>}

    {step === 2 && <Card><div className="phone-kicker">QUICK QUESTIONS</div><h2 className="phone-title">Tell us a bit about you</h2><p className="phone-sub">It only takes a few seconds to get started.</p><form onSubmit={submitForm} className="phone-form">
      <label className="phone-label">1. What's your name?<input required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" className="input"/></label>
      <label className="phone-label">2. What will you be studying?<input required value={study} onChange={e => setStudy(e.target.value)} placeholder="Enter your degree or field of study" className="input"/></label>
      <div><div className="phone-label mb-3">3. What are you interested in? <span>(optional)</span></div><div className="interest-grid">{['Socialising', 'Hobbyist', 'Learning'].map(i => <button type="button" key={i} onClick={() => toggleInterest(i)} className={`interest-chip ${interests.includes(i) ? 'selected' : ''}`}>{interests.includes(i) ? '✓ ' : ''}{i}</button>)}</div></div>
      <button className="primary">Continue</button>
    </form></Card>}
    {step === 3 && <Card center><CheckCircle className="success-icon" size={50}/><div className="phone-kicker">YOU'RE ALL SET</div><h2 className="phone-title">Ready to spin?</h2><p className="phone-sub mb-7">Your wheel is about to appear on the big screen too.</p><button onClick={showWheel} className="primary">Show the Wheel</button></Card>}
    {step === 4 && <Card center><div className="phone-kicker">YOUR TURN</div><h2 className="phone-title mb-7">Spin the Wheel</h2><Wheel spin={spin} size="small"/><button onClick={spinWheel} disabled={spin?.active} className="primary mt-8"><RotateCw size={16}/>{spin?.active ? 'Spinning…' : 'SPIN'}</button></Card>}
    {step === 5 && <Card><div className="phone-kicker">YOUR WHEEL RESULT</div><h2 className="phone-title text-center">{selectedGame}</h2><p className="phone-sub text-center mb-6">Choose how you want to play.</p><div className="mode-grid"><ModeButton active={mode === 'Multiplayer'} icon={<Users size={20}/>} onClick={() => setMode('Multiplayer')}>Multiplayer</ModeButton><ModeButton active={mode === 'Single Player'} icon={<User size={20}/>} onClick={() => setMode('Single Player')}>Single Player</ModeButton></div><button onClick={joinQueue} className="primary mt-5">Join Queue</button></Card>}
    {step === 6 && <Card center><div className="queue-orb">⌛</div><div className="phone-kicker">QUEUE</div><h2 className="phone-title">You're in!</h2><p className="phone-sub mb-5">{selectedGame} · {mode}</p><div className="queue-list">{queue.filter(p => p.game === selectedGame && p.mode === mode).map(p => <div key={p.playerId} className="queue-row"><span>#{p.position} {p.name}</span><span>{p.playerId === playerId ? 'You' : 'Waiting'}</span></div>)}</div><p className="phone-hint">We'll bring you in when the main screen is available.</p></Card>}
    {step === 7 && <Card><LiveGame game={selectedGame} data={gameData} onEvent={gameEvent} onComplete={finish} playerId={playerId}/></Card>}
    {step === 8 && <Card center><div className="queue-orb result-orb">🏆</div><div className="phone-kicker">GAME COMPLETE</div><h2 className="phone-title">Great job!</h2><p className="phone-sub score-result">Your score: <strong>{result?.scores?.[playerId] ?? result?.score ?? 0}</strong></p><div className="result-actions"><button type="button" className="primary" onClick={spinAgain}>↻ Spin again</button><button type="button" className="secondary" onClick={() => {}}>🏆 Leaderboard</button><button type="button" className="secondary exit-button" onClick={exitToForm}>Exit</button></div></Card>}
  </div>;
}

function Card({ children, center }) { return <div className={`phone-card ${center ? 'text-center' : ''}`}>{children}</div>; }
function ModeButton({ active, icon, children, onClick }) { return <button type="button" onClick={onClick} className={`mode-button ${active ? 'active' : ''}`}>{icon}<span>{children}</span></button>; }

function LiveGame({ game, data, onEvent, onComplete, playerId }) {
  if (game === 'Debug Dash') return <DebugDash data={data} onEvent={onEvent} onComplete={onComplete}/>;
  if (game === 'Robot Rescue') return <RobotRescue data={data} onEvent={onEvent} onComplete={onComplete}/>;
  return <GuessOutput data={data} onEvent={onEvent} onComplete={onComplete} playerId={playerId}/>;
}

function GameTimer({ seconds = 20, startedAt, deadlineAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const live = deadlineAt ? Math.max(0, (deadlineAt - now) / 1000) : (startedAt ? Math.max(0, seconds - (now - startedAt) / 1000) : seconds);
  return <div className={`game-timer ${live <= 5 ? 'timer-danger' : ''}`}><Clock3 size={15}/>{Math.ceil(live)}s</div>;
}
function DebugDash({ data, onEvent }) {
  const left = data?.timeLimit || 25;
  const lines = (data?.code || '').split('\n');
  return <div><div className="game-top"><div><div className="phone-kicker">LEVEL {data?.level || 1} / 4</div><h2 className="phone-title"><Terminal size={24}/> Debug Dash</h2></div><GameTimer seconds={left} startedAt={data?.startedAt} deadlineAt={data?.deadlineAt}/></div><p className="phone-sub">Tap the line you think contains the bug.</p><div className="mobile-code">{lines.map((line, i) => <button key={i} onClick={() => onEvent({ action: 'DEBUG_LINE', line: i })} className="mobile-code-line"><span>{String(i + 1).padStart(2, '0')}</span><code>{line || ' '}</code></button>)}</div><p className="game-tip">A miss costs 50 points. A correct line unlocks a harder level.</p></div>;
}

function RobotRescue({ data, onEvent }) {
  const [program, setProgram] = useState(data?.program || []);
  const labels = { up: 'MOVE UP', down: 'MOVE DOWN', forward: 'MOVE FORWARD', backward: 'MOVE BACKWARD', left: 'TURN LEFT', right: 'TURN RIGHT' };
  const obstacles = data?.obstacles || [];
  useEffect(() => { setProgram(data?.program || []); }, [data?.program]);
  const add = command => setProgram(prev => [...prev, command]);
  const removeLast = () => setProgram(prev => prev.slice(0, -1));
  const clearProgram = () => setProgram([]);
  const run = () => { if (!program.length || data?.executing) return; onEvent({ action: 'ROBOT_PROGRAM', commands: program }); setTimeout(() => onEvent({ action: 'ROBOT_RUN' }), 40); };
  return <div><div className="game-top"><div><div className="phone-kicker">LEVEL {data?.level || 1} / 4</div><h2 className="phone-title"><Bot size={24}/> Robot Rescue</h2></div><GameTimer seconds={data?.timeLimit || 35} startedAt={data?.startedAt} deadlineAt={data?.deadlineAt}/></div><p className="phone-sub">Build a Scratch-style command sequence and guide the robot to the finish. No move limit — plan, run, learn and try again.</p><div className="robot-preview">{Array.from({length:25}).map((_,i) => <div key={i} className={`robot-cell ${data?.path?.includes(i) ? 'visited' : ''} ${i === data?.robot ? 'robot-cell-active' : ''} ${obstacles.includes(i) ? 'robot-obstacle' : ''}`}>{i === data?.robot ? <Bot size={22}/> : i === 24 ? '🏁' : obstacles.includes(i) ? '✦' : ''}</div>)}</div><div className="robot-command-list">{program.length ? program.map((cmd, i) => <span className="command-block" key={`${cmd}-${i}`}>{i + 1}. {labels[cmd]}</span>) : <span className="phone-hint">Add blocks below…</span>}</div><div className="robot-command-builder"><button type="button" onClick={() => add('up')}>↑ Move up</button><button type="button" onClick={() => add('down')}>↓ Move down</button><button type="button" onClick={() => add('left')}>↶ Turn left</button><button type="button" onClick={() => add('forward')}>➜ Move forward</button><button type="button" onClick={() => add('backward')}>← Move backward</button><button type="button" onClick={() => add('right')}>↷ Turn right</button></div><div className="robot-program-actions"><button type="button" className="secondary" onClick={removeLast} disabled={!program.length || data?.executing}>↩ Remove last</button><button type="button" className="secondary" onClick={clearProgram} disabled={!program.length || data?.executing}>✕ Clear</button></div><button type="button" className="robot-run-button" onClick={run} disabled={!program.length || data?.executing}>{data?.executing ? 'Robot running…' : '▶ Run program'}</button><div className="moves-count">Level {data?.level || 1} · {data?.executing ? 'Executing your program' : 'Build your program'}</div></div>;
}

function GuessOutput({ data, onEvent, playerId }) {
  const [buzzed, setBuzzed] = useState(false);
  useEffect(() => { setBuzzed(false); }, [data?.level, data?.question]);
  const multiplayer = data?.mode !== 'Single Player';
  const buzz = () => { setBuzzed(true); onEvent({ action: 'BUZZ' }); };
  const options = data?.options || [];
  const lockedForPlayer = multiplayer && data?.buzzedBy && data.buzzedBy !== playerId;
  return <div><div className="game-top"><div><div className="phone-kicker">LEVEL {data?.level || 1} / 4</div><h2 className="phone-title"><Code2 size={24}/> Guess The Output</h2></div><GameTimer seconds={data?.timeLimit || 25} startedAt={data?.startedAt} deadlineAt={data?.deadlineAt}/></div><pre className="code-challenge phone-code">{data?.question || "console.log(2 + '2');"}</pre>{multiplayer && !buzzed && !data?.buzzedBy ? <button onClick={buzz} className="buzz-button"><Zap/> BUZZ IN</button> : multiplayer ? <div className="buzz-lock">{data?.buzzedBy ? (data.buzzedBy === playerId ? 'You have first crack at it!' : 'Another player has first crack at it!') : 'You are buzzed in!'}</div> : <div className="buzz-lock">Choose your answer</div>}<div className="answer-list">{options.map(opt => <button key={opt} onClick={() => onEvent({action:'ANSWER', answer:opt})} className={`answer-button ${data?.selected === opt ? 'selected' : ''}`} disabled={!!lockedForPlayer}>{opt}</button>)}</div><p className="game-tip">{data?.message || 'Your answer is checked instantly.'} · Right answer scores more at higher levels · Wrong answer −50 (minimum 0)</p></div>;
}
