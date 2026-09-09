import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Wifi, Users, Sparkles } from 'lucide-react';
import Wheel from './Wheel';
import PublicGame from './PublicGame';
import AmbientMusic from './AmbientMusic';

export default function MonitorScreen({ sessionId }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    const s = io(window.location.origin, { transports: ['websocket', 'polling'], reconnection: true });
    s.on('connect', () => s.emit('monitor:join', { sessionId }, r => {
      if (!r?.ok) return setError(r?.error || 'Session unavailable');
      setState(r.state); setError('');
    }));
    s.on('session:state', setState);
    s.on('session:public', msg => {
      if (msg.type === 'GAME_FINISHED') playTone();
    });
    s.on('connect_error', () => setError('Monitor cannot reach the laptop server.'));
    return () => s.disconnect();
  }, [sessionId]);

  const playTone = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioRef.current ||= new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 740; gain.gain.value = .05;
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .18);
    } catch {}
  };

  const phase = state?.publicPhase?.type;
  const active = state?.activeGroup;
  const showWheel = phase === 'WHEEL_READY' || phase === 'WHEEL' || state?.wheel?.active;
  const showLoadingGames = phase === 'LOADING_GAMES';
  const showAnnouncement = phase === 'GAME_ANNOUNCEMENT' && !!active;
  const showGame = phase === 'GAME' && !!active;
  const showResults = phase === 'RESULTS';
  const waitingPlayers = state?.playersCount || state?.queue?.length || 0;

  return <div className="monitor-shell">
    <header className="monitor-header"><div><div className="brand-kicker">SPIN THE WHEEL</div><h1>{showGame ? active.game : showWheel ? 'Spin the Wheel' : showLoadingGames ? 'Loading games...' : showAnnouncement ? `Let's play ${active.game}` : showResults ? 'Great job!' : 'Get ready'}</h1></div><div className="monitor-live"><AmbientMusic compact /><span><Wifi size={16}/> Live</span><span><Users size={16}/> {waitingPlayers} waiting</span></div></header>
    <main className="monitor-main">
      {showWheel && <div className="monitor-wheel-wrap"><div className="show-eyebrow">YOUR GAME IS BEING CHOSEN</div><Wheel spin={state.wheel} size="large"/><div className="show-caption">{state.wheel?.active ? 'And the winner is...' : 'Get ready to spin!'}</div></div>}
      {showLoadingGames && <LoadingGames />}
      {showAnnouncement && <Announcement game={active.game} mode={active.mode} players={active.players || []} />}
      {showGame && <PublicGameStage active={active} gameDataByPlayer={state.gameDataByPlayer || {}} fallback={state.gameData} />}
      {showResults && <Results phase={state.publicPhase} />}
      {!showWheel && !showLoadingGames && !showAnnouncement && !showGame && !showResults && <Idle />}
    </main>
    <footer className="monitor-footer"><span>Scan to join anytime from the Host Control</span><span>{state?.groups?.length || 0} game group{(state?.groups?.length || 0) === 1 ? '' : 's'} waiting</span></footer>
    {error && <div className="fixed bottom-5 left-5 bg-amber-500/15 border border-amber-500/40 px-4 py-3 rounded-xl text-amber-200 text-sm">{error}</div>}
  </div>;
}

function PublicGameStage({ active, gameDataByPlayer, fallback }) {
  const players = active?.players || [];
  const multiplayer = active?.mode === 'Multiplayer' && players.length > 1;
  if (!multiplayer) {
    const data = gameDataByPlayer?.[players[0]?.playerId] || fallback;
    return <PublicGame game={active?.game} gameData={data} players={players} />;
  }
  return <div className="w-full max-w-[1500px]">
    <div className="multiplayer-monitor-title"><span>MULTIPLAYER</span><strong>Head-to-head</strong><small>Each player has their own challenge</small></div>
    <div className="multiplayer-monitor-grid">{players.slice(0, 4).map((p, index) => (
      <div className="multiplayer-player-panel" key={p.playerId}>
        <div className="multiplayer-player-header"><span>PLAYER {index + 1}</span><strong>{p.name}</strong></div>
        <PublicGame game={active.game} gameData={gameDataByPlayer?.[p.playerId] || fallback} players={[p]} />
      </div>
    ))}</div>
  </div>;
}

function LoadingGames() { return <div className="show-card"><Sparkles size={52} className="text-cyan-300 mx-auto mb-7"/><div className="show-eyebrow">NEXT UP</div><h2>Loading game...</h2><div className="loading-dots"><i/><i/><i/></div><p>Get ready to play.</p></div>; }
function Announcement({ game, mode, players }) { return <div className="show-card"><div className="show-eyebrow">LET'S PLAY</div><h2>{game}</h2><div className="announcement-meta">{mode} · {players.length} {players.length === 1 ? 'player' : 'players'}</div><div className="pulse-ring">🎮</div></div>; }
function Results({ phase }) { return <div className="show-card results-card"><div className="trophy-burst">🏆</div><div className="show-eyebrow">GAME COMPLETE</div><h2>Great job!</h2>{phase?.score !== undefined && <p>Score: <strong>{phase.score}</strong></p>}<div className="confetti-row">✦ ✧ ✦ ✧ ✦</div></div>; }
function Idle() { return <div className="show-card"><div className="text-7xl mb-8">✨</div><div className="show-eyebrow">READY WHEN YOU ARE</div><h2>Let's play!</h2><p>Players can join from the Host Control.</p></div>; }
