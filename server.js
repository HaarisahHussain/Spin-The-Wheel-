import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer } from 'node:http';
import { randomInt } from 'node:crypto';
import express from 'express';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const SPIN_DURATION = 3500;
const GAMES = ['Debug Dash', 'Robot Rescue', 'Guess The Output'];
const WHEEL_SEGMENT_CENTERS = [60, 180, 300];
const MAX_GROUP_SIZE = 4;
const GAME_ANNOUNCEMENT_DURATION = 2200;
const LOADING_GAMES_DURATION = 1400;

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const info of entries || []) {
      if (info.family === 'IPv4' && !info.internal && !info.address.startsWith('169.254.')) return info.address;
    }
  }
  return 'localhost';
}

function makeSessionId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const app = express();
const httpServer = createHttpServer(app);
const io = new Server(httpServer, { cors: { origin: true, credentials: true } });
const sessions = new Map();

function getSession(id) { return sessions.get(String(id || '').toUpperCase()); }
function publicPlayer(p) {
  return { playerId: p.id, name: p.name || 'Player', mode: p.mode, game: p.game, status: p.status, study: p.study || '', interests: p.interests || [] };
}
function queueFor(session) {
  return session.queue.map(id => session.players.get(id)).filter(Boolean).map((p, i) => ({ ...publicPlayer(p), position: i + 1 }));
}
function groupsFor(session) {
  const groups = new Map();
  for (const item of queueFor(session)) {
    const key = `${item.game}::${item.mode}`;
    if (!groups.has(key)) groups.set(key, { key, game: item.game, mode: item.mode, players: [], firstPosition: item.position });
    groups.get(key).players.push(item);
  }
  return [...groups.values()].sort((a, b) => a.firstPosition - b.firstPosition).map(g => ({ ...g, ready: g.mode === 'Single Player' ? g.players.length >= 1 : g.players.length >= 2 }));
}
function publicState(session) {
  return {
    sessionId: session.sessionId,
    playersCount: session.players.size,
    queue: queueFor(session),
    groups: groupsFor(session),
    activeGroup: session.activeGroup ? {
      id: session.activeGroup.id,
      game: session.activeGroup.game,
      mode: session.activeGroup.mode,
      players: session.activeGroup.players.map(publicPlayer),
    } : null,
    state: session.state,
    publicPhase: session.publicPhase,
    wheel: session.wheel,
    wheelByPlayer: session.wheelByPlayer ? Object.fromEntries([...session.wheelByPlayer.entries()]) : {},
    gameData: session.gameData,
    gameDataByPlayer: session.gameDataByPlayer ? Object.fromEntries([...session.gameDataByPlayer.entries()].map(([id, data]) => [id, data])) : {},
  };
}
function broadcastState(session) {
  io.to(session.sessionId).emit('session:state', publicState(session));
}
function emitPublic(session, type, payload = {}) {
  io.to(session.sessionId).emit('session:public', { type, payload });
}

function findNextReadyGroup(session, requestedKey = null) {
  if (session.activeGroup) return null;
  const groups = groupsFor(session);
  if (requestedKey) return groups.find(g => g.ready && g.key === requestedKey) || null;
  // Single-player games can start automatically. Multiplayer groups wait for the host.
  return groups.find(g => g.ready && g.mode === 'Single Player') || null;
}


function pick(arr) { return arr[randomInt(arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function freshTemplates(templates, used, keyFn = x => x.question || x.code?.join('\n') || JSON.stringify(x)) {
  let available = templates.filter(t => !used.has(keyFn(t)));
  if (available.length < 4) {
    used.clear();
    available = [...templates];
  }
  const chosen = shuffle(available).slice(0, 4);
  chosen.forEach(t => used.add(keyFn(t)));
  return chosen;
}

function generateDebugLevels(used = new Set()) {
  // Generate a fresh set of four challenges for each game session. The random
  // values mean a new session does not simply replay the same questions.
  const levels = [];
  const make = (code, targetLine, message) => ({ code: code.join('\n'), targetLine: targetLine - 1, message });
  const n1 = randomInt(2, 10), n2 = randomInt(2, 10);
  levels.push(make([
    `function add(a, b) {`,
    `  return a + ${n1};`,
    `}`
  ], 2, 'The function should use both inputs. Spot the bug.'));

  const threshold = randomInt(12, 25), value = randomInt(3, 10);
  levels.push(make([
    `const score = ${value};`,
    `if (score > ${threshold}) {`,
    `  console.log("WIN");`,
    `}`
  ], 2, 'The condition can never be true. Find the bug.'));

  const limit = randomInt(4, 8);
  levels.push(make([
    `for (let i = 0; i < ${limit}; i--) {`,
    `  console.log(i);`,
    `}`
  ], 1, 'The loop is moving in the wrong direction. Find it.'));

  const names = ['Ada', 'Sam', 'Maya', 'Alex', 'Leo'];
  const person = names[randomInt(names.length)];
  levels.push(make([
    `const name = "${person}";`,
    `const greeting = \`Hi ${'${name}'}\`;`,
    `console.log(greeting.toUppercase());`
  ], 3, 'Boss level: the method name is subtly wrong.'));

  // Extra variants make the pool effectively much larger between sessions.
  const scoreValue = randomInt(1, 20);
  levels.push(make([
    `let score = ${scoreValue};`,
    `if (score = ${randomInt(21, 40)}) {`,
    `  console.log("Great!");`,
    `}`
  ], 2, 'Assignment or comparison? Spot the bug.'));

  const arr = shuffle([1,2,3,4,5]).slice(0,3);
  levels.push(make([
    `const nums = [${arr.join(', ')}];`,
    `console.log(nums[${arr.length}]);`,
    `console.log("done");`
  ], 2, 'The index points past the end of the array.'));

  const chosen = shuffle(levels).slice(0, 4);
  return chosen.map((x, i) => ({ ...x, level: i + 1 }));
}

function generateGuessLevels(used = new Set()) {
  const levels = [];
  const add = (question, options, correctAnswer) => levels.push({ question, options, correctAnswer });
  const a = randomInt(2, 10), b = randomInt(2, 10);
  const sum = a + b;
  add(`console.log(${a} + ${b});`, [`A) ${sum-1}`, `B) ${sum}`, `C) ${sum+1}`, 'D) Error'], `B) ${sum}`);

  const x = randomInt(2, 9), y = randomInt(2, 9);
  const product = x * y;
  add(`console.log(${x} * ${y} + 1);`, [`A) ${product}`, `B) ${product+1}`, `C) ${x+y+1}`, 'D) Error'], `B) ${product+1}`);

  const str = ['cat','code','game','robot','hello'][randomInt(5)];
  add(`console.log('${str}'.length);`, [`A) ${str.length-1}`, `B) ${str.length}`, `C) ${str.length+1}`, 'D) undefined'], `B) ${str.length}`);

  const m = randomInt(2, 9), n = randomInt(2, 9);
  const truth = m > n;
  add(`console.log(${m} > ${n} && ${n} > 1);`, ['A) true','B) false','C) 1','D) Error'], `B) false`);
  // Correct the generated boolean case when the expression is actually true.
  if (truth && n > 1) levels[levels.length - 1].correctAnswer = 'A) true';

  const modA = randomInt(5, 20), modB = randomInt(2, 5), rem = modA % modB;
  add(`console.log(${modA} % ${modB});`, [`A) ${rem}`, `B) ${rem+1}`, `C) ${modB}`, `D) Error`], `A) ${rem}`);

  const divA = randomInt(4, 30), divB = randomInt(2, 6), div = divA / divB;
  if (Number.isInteger(div)) add(`console.log(${divA} / ${divB} === ${div});`, ['A) true','B) false','C) Error','D) undefined'], 'A) true');
  else add(`console.log(${divA} / ${divB} > 1);`, ['A) true','B) false','C) Error','D) undefined'], `A) ${divA/divB > 1 ? 'true' : 'false'}`);

  const boolNum = randomInt(1, 9);
  add(`console.log(Boolean(${boolNum}));`, ['A) true','B) false','C) 0','D) Error'], 'A) true');

  const q = randomInt(3, 12), r = randomInt(1, q-1);
  add(`console.log(${q} > ${r} && ${r} < ${q});`, ['A) true','B) false','C) 1','D) Error'], 'A) true');

  return shuffle(levels).slice(0, 4).map((x, i) => ({ ...x, level: i + 1 }));
}

function hasRobotPath(obstacles) {
  const blocked = new Set(obstacles);
  const q = [0], seen = new Set([0]);
  while (q.length) {
    const n = q.shift(); if (n === 24) return true;
    const r = Math.floor(n / 5), c = n % 5;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr=r+dr,nc=c+dc, nn=nr*5+nc;
      if(nr>=0&&nr<5&&nc>=0&&nc<5&&!blocked.has(nn)&&!seen.has(nn)){seen.add(nn);q.push(nn);}
    }
  }
  return false;
}
function generateRobotLevels() {
  const levels = [];
  for (let level = 1; level <= 4; level++) {
    let obstacles;
    do {
      const count = 3 + level * 2;
      obstacles = shuffle([...Array(23).keys()].slice(1)).slice(0, count);
    } while (!hasRobotPath(obstacles));
    levels.push({ obstacles, message: level === 4 ? 'Boss level. Build a clean route to the finish.' : 'New layout! Plan your blocks and reach the finish.' });
  }
  return levels;
}

function makeGameData(game, players, session) {
  const scores = Object.fromEntries(players.map(p => [p.id, 0]));
  if (game === 'Debug Dash') {
    const levels = generateDebugLevels(session.debugHistory);
    return { game, mode: '', startedAt: null, status: 'READY', level: 1, timeLimit: 25,
      targetLine: levels[0].targetLine, code: levels[0].code, message: levels[0].message,
      debugLevels: levels, scores, completed: false };
  }
  if (game === 'Robot Rescue') {
    const levels = generateRobotLevels();
    return { game, mode: '', startedAt: null, status: 'READY', level: 1, timeLimit: 35,
      robot: 0, row: 0, col: 0, orientation: 1, path: [0], commands: [], program: [],
      robotLevels: levels, obstacles: levels[0].obstacles, message: levels[0].message,
      executing: false, runIndex: 0, scores, completed: false };
  }
  const levels = generateGuessLevels();
  return { game, mode: '', startedAt: null, status: 'READY', level: 1, timeLimit: 25,
    question: levels[0].question, options: levels[0].options, correctAnswer: levels[0].correctAnswer,
    guessLevels: levels, selected: null, buzzedBy: null, scores,
    message: 'Buzz first, then answer', completed: false };
}

function robotLevel(level, data = null) {
  if (data?.robotLevels?.[level - 1]) return data.robotLevels[level - 1];
  return { obstacles: [], message: 'Reach the finish.' };
}
function guessLevel(level, data = null) {
  if (data?.guessLevels?.[level - 1]) return data.guessLevels[level - 1];
  return null;
}
function debugLevel(level, data = null) {
  if (data?.debugLevels?.[level - 1]) return data.debugLevels[level - 1];
  return null;
}

function clearGameTimer(session) {
  if (session.gameTimer) {
    clearTimeout(session.gameTimer);
    session.gameTimer = null;
  }
}

function startGameTimer(session, active) {
  clearGameTimer(session);
  const firstData = session.gameDataByPlayer?.get(active.players[0]?.id);
  const limit = Number(firstData?.timeLimit || session.gameData?.timeLimit || 30);
  session.gameTimer = setTimeout(() => {
    if (!session.activeGroup || session.activeGroup.id !== active.id) return;
    if (!session.activeGroup) return;
    const scores = {};
    for (const p of session.activeGroup.players) {
      const d = session.gameDataByPlayer?.get(p.id);
      if (d) { d.status = 'TIME_UP'; d.completed = true; d.timeExpired = true; scores[p.id] = Math.max(0, Number(d.scores?.[p.id] || 0)); }
    }
    finishActiveGroup(session, { score: 0, scores, reason: 'TIME_UP' });
  }, limit * 1000 + 100);
}

function startNextGroup(session, afterGame = false, requestedKey = null) {
  const group = findNextReadyGroup(session, requestedKey);
  if (!group) {
    session.state = session.queue.length ? 'QUEUED' : 'WAITING';
    // Keep the public display on the current waiting/loading phase.
    // In particular, never jump back to the form message after a wheel spin.
    if (afterGame || !session.publicPhase || session.publicPhase.type === 'GAME_ANNOUNCEMENT' || session.publicPhase.type === 'GAME') {
      session.publicPhase = { type: 'FILLING_FORMS', startedAt: Date.now() };
    }
    broadcastState(session);
    return;
  }

  const ids = group.players.slice(0, MAX_GROUP_SIZE).map(p => p.playerId);
  const active = {
    id: `${session.sessionId}-${Date.now()}`,
    game: group.game,
    mode: group.mode,
    players: ids.map(id => session.players.get(id)).filter(Boolean),
  };
  session.activeGroup = active;
  session.state = 'ANNOUNCING';
  active.players.forEach(p => { p.status = 'STARTING'; });
  session.queue = session.queue.filter(id => !ids.includes(id));
  session.gameDataByPlayer = new Map(active.players.map(p => {
    const d = makeGameData(active.game, [p], session);
    d.mode = active.mode;
    return [p.id, d];
  }));
  session.gameData = session.gameDataByPlayer.get(active.players[0]?.id) || null;
  session.publicPhase = { type: 'GAME_ANNOUNCEMENT', game: active.game, mode: active.mode, players: active.players.map(publicPlayer), startedAt: Date.now() };

  for (const p of active.players) {
    io.to(p.id).emit('session:command', { type: 'GAME_ANNOUNCEMENT', payload: { game: active.game, mode: active.mode, groupId: active.id } });
  }
  emitPublic(session, 'GAME_ANNOUNCEMENT', { game: active.game, mode: active.mode, players: active.players.map(publicPlayer) });
  broadcastState(session);

  setTimeout(() => {
    if (session.activeGroup?.id !== active.id) return;
    session.state = 'PLAYING';
    active.players.forEach(p => { p.status = 'PLAYING'; });
    const gameStartedAt = Date.now();
    for (const p of active.players) {
      const d = session.gameDataByPlayer.get(p.id);
      if (d) {
        d.mode = active.mode;
        d.startedAt = gameStartedAt;
        d.deadlineAt = gameStartedAt + Number(d.timeLimit || 30) * 1000;
        d.status = 'PLAYING';
        d.timeLeft = d.timeLimit;
      }
    }
    session.gameData = session.gameDataByPlayer.get(active.players[0]?.id) || null;
    session.publicPhase = { type: 'GAME', game: active.game, mode: active.mode, startedAt: gameStartedAt };
    for (const p of active.players) {
      io.to(p.id).emit('session:command', { type: 'START_GAME', payload: { game: active.game, mode: active.mode, groupId: active.id } });
    }
    emitPublic(session, 'GAME_STARTED', { game: active.game, mode: active.mode, players: active.players.map(publicPlayer) });
    broadcastState(session);
    startGameTimer(session, active);
  }, GAME_ANNOUNCEMENT_DURATION);
}

function collectScores(session) {
  const scores = {};
  for (const p of session.activeGroup?.players || []) {
    const d = session.gameDataByPlayer?.get(p.id);
    scores[p.id] = Math.max(0, Number(d?.scores?.[p.id] || 0));
  }
  return scores;
}

function finishActiveGroup(session, scorePayload = {}) {
  if (!session.activeGroup) return;
  clearGameTimer(session);
  const finished = session.activeGroup;
  finished.players.forEach(p => { p.status = 'FINISHED'; });
  const finishedPlayers = finished.players.map(publicPlayer);
  emitPublic(session, 'GAME_FINISHED', { game: finished.game, mode: finished.mode, players: finishedPlayers, ...scorePayload });
  session.activeGroup = null;
  session.gameData = null;
  session.gameDataByPlayer = null;
  session.state = 'WAITING';
  session.publicPhase = { type: 'RESULTS', startedAt: Date.now(), finishedPlayers, game: finished.game, mode: finished.mode, ...scorePayload };
  broadcastState(session);
  setTimeout(() => startNextGroup(session, true), 1800);
}

function activeCanAnswer(data, playerId) {
  if (data.mode === 'Single Player') return true;
  return !data.buzzedBy || data.buzzedBy === playerId;
}

io.on('connection', socket => {
  socket.on('monitor:create-session', (_, ack) => {
    let sessionId = makeSessionId();
    while (sessions.has(sessionId)) sessionId = makeSessionId();
    const session = {
      sessionId,
      hostSocketId: socket.id,
      players: new Map(),
      queue: [],
      activeGroup: null,
      state: 'WAITING',
      wheel: null,
      wheelByPlayer: new Map(),
      gameData: null,
      gameDataByPlayer: null,
      publicPhase: { type: 'FILLING_FORMS', startedAt: Date.now() },
      gameTimer: null,
      wheelBag: [],
      lastWheelGame: null,
      debugHistory: new Set(),
      guessHistory: new Set(),
    };
    sessions.set(sessionId, session);
    socket.join(sessionId);
    socket.data.role = 'host';
    socket.data.sessionId = sessionId;
    ack?.({ ok: true, sessionId, mobileUrl: `http://${getLanIp()}:${PORT}/?view=mobile&session=${sessionId}`, monitorUrl: `http://${getLanIp()}:${PORT}/?view=monitor&session=${sessionId}` });
    broadcastState(session);
  });

  socket.on('monitor:join', ({ sessionId } = {}, ack) => {
    const session = getSession(sessionId);
    if (!session) return ack?.({ ok: false, error: 'Session not found.' });
    socket.join(session.sessionId);
    socket.data.role = 'monitor';
    socket.data.sessionId = session.sessionId;
    ack?.({ ok: true, state: publicState(session) });
  });

  socket.on('player:join', ({ sessionId } = {}, ack) => {
    const session = getSession(sessionId);
    if (!session) return ack?.({ ok: false, error: 'Session not found. Please scan a fresh QR code.' });
    socket.join(session.sessionId);
    socket.data.role = 'player';
    socket.data.sessionId = session.sessionId;
    socket.data.playerId = socket.id;
    session.players.set(socket.id, { id: socket.id, name: '', reason: '', mode: 'Single Player', game: '', status: 'CONNECTED', study: '', interests: [] });
    ack?.({ ok: true, sessionId: session.sessionId, playerId: socket.id });
    emitPublic(session, 'PLAYER_CONNECTED', { playerCount: session.players.size });
    broadcastState(session);
  });

  socket.on('host:event', ({ type, payload = {} } = {}, ack) => {
    const session = getSession(socket.data.sessionId);
    if (!session || socket.data.role !== 'host' || session.hostSocketId !== socket.id) {
      return ack?.({ ok: false, error: 'Host controls are only available on the Host Control screen.' });
    }

    if (type === 'START_MULTIPLAYER') {
      if (session.activeGroup) return ack?.({ ok: false, error: 'A game is already running.' });
      const key = payload.key;
      const group = findNextReadyGroup(session, key);
      if (!group || group.mode !== 'Multiplayer') return ack?.({ ok: false, error: 'That multiplayer group is not ready. You need at least 2 players.' });
      startNextGroup(session, false, key);
      ack?.({ ok: true });
      return;
    }

    if (type === 'END_MULTIPLAYER') {
      if (!session.activeGroup || session.activeGroup.mode !== 'Multiplayer') return ack?.({ ok: false, error: 'No multiplayer game is currently running.' });
      finishActiveGroup(session, { scores: collectScores(session), reason: 'HOST_ENDED' });
      ack?.({ ok: true });
      return;
    }

    if (type === 'RESET_SERVER') {
      clearGameTimer(session);
      const oldPlayers = [...session.players.values()];
      session.queue = [];
      session.activeGroup = null;
      session.gameData = null;
      session.gameDataByPlayer = null;
      session.wheel = null;
      session.wheelBag = [];
      session.lastWheelGame = null;
      session.debugHistory = new Set();
      session.guessHistory = new Set();
      session.state = 'WAITING';
      session.publicPhase = { type: 'FILLING_FORMS', startedAt: Date.now() };
      for (const p of oldPlayers) {
        p.name = ''; p.reason = ''; p.study = ''; p.interests = []; p.mode = 'Single Player'; p.game = ''; p.status = 'CONNECTED';
        io.to(p.id).emit('session:command', { type: 'SERVER_RESET' });
      }
      broadcastState(session);
      emitPublic(session, 'SERVER_RESET', {});
      ack?.({ ok: true });
      return;
    }
  });

  socket.on('player:event', ({ type, payload = {} } = {}) => {
    const session = getSession(socket.data.sessionId);
    const player = session?.players.get(socket.data.playerId);
    if (!session || !player) return;

    if (type === 'FORM_SUBMITTED') {
      player.name = payload.name || 'Player';
      player.reason = payload.study || ''; player.study = payload.study || ''; player.interests = Array.isArray(payload.interests) ? payload.interests : [];
      player.status = 'FORM_FILLED';
      // Once a player has submitted the form, the public flow moves to the wheel.
      // Never return the monitor to the form-filling screen for this player.
      session.publicPhase = { type: 'WHEEL_READY', playerId: player.id, playerName: player.name, startedAt: Date.now() };
      emitPublic(session, type, { playerId: player.id, name: player.name });
      broadcastState(session);
      return;
    }

    if (type === 'SHOW_WHEEL') {
      session.publicPhase = { type: 'WHEEL_READY', playerId: player.id, playerName: player.name || 'Player', startedAt: Date.now() };
      player.status = 'READY_TO_SPIN';
      emitPublic(session, 'WHEEL_READY', { playerId: player.id, playerName: player.name || 'Player' });
      broadcastState(session);
      return;
    }

    if (type === 'SPIN_REQUEST') {
      // Each player owns their own wheel. Multiple players can therefore spin
      // at the same time without one player's animation/result cancelling or
      // replacing another player's spin.
      const currentWheel = session.wheelByPlayer?.get(player.id);
      if (currentWheel?.active) return;

      // Use the shared shuffled bag for fair game distribution, but keep the
      // animation/rotation/state completely independent per player.
      if (!Array.isArray(session.wheelBag) || session.wheelBag.length === 0) {
        session.wheelBag = shuffle(GAMES);
        if (session.lastWheelGame && session.wheelBag.length > 1 && session.wheelBag[0] === session.lastWheelGame) {
          [session.wheelBag[0], session.wheelBag[1]] = [session.wheelBag[1], session.wheelBag[0]];
        }
      }
      const chosen = session.wheelBag.shift();
      session.lastWheelGame = chosen;
      const chosenIndex = GAMES.indexOf(chosen);
      const startRotation = currentWheel?.rotation || 0;
      const centre = WHEEL_SEGMENT_CENTERS[chosenIndex];

      // CSS conic-gradient starts at 12 o'clock and the pointer is at 12.
      const landing = ((360 - centre - (startRotation % 360)) + 360) % 360;
      const delta = 5 * 360 + landing;
      const wheel = {
        active: true,
        playerId: player.id,
        playerName: player.name || 'Player',
        result: chosen,
        startRotation,
        delta,
        duration: SPIN_DURATION,
        startedAt: Date.now()
      };

      session.wheelByPlayer.set(player.id, wheel);
      // Keep the legacy public wheel as the most recently started spin for
      // the public monitor, while the phone always reads its own wheel.
      session.wheel = wheel;
      session.state = 'SPINNING';
      session.publicPhase = {
        type: 'WHEEL',
        playerId: player.id,
        playerName: player.name || 'Player',
        startedAt: wheel.startedAt
      };
      player.status = 'SPINNING';

      emitPublic(session, 'SPIN_STARTED', { ...wheel });
      socket.emit('session:command', { type: 'SPIN_STARTED', payload: wheel });
      broadcastState(session);

      setTimeout(() => {
        const ownWheel = session.wheelByPlayer?.get(player.id);
        if (!ownWheel || ownWheel.startedAt !== wheel.startedAt) return;

        player.game = chosen;
        player.status = 'GAME_SELECTED';

        const finishedWheel = { ...ownWheel, active: false, finishedAt: Date.now() };
        session.wheelByPlayer.set(player.id, finishedWheel);
        if (session.wheel?.playerId === player.id) session.wheel = finishedWheel;

        session.state = session.activeGroup ? 'GAME' : 'LOADING_GAMES';
        session.publicPhase = {
          type: 'LOADING_GAMES',
          game: chosen,
          playerId: player.id,
          playerName: player.name || 'Player',
          startedAt: Date.now()
        };

        emitPublic(session, 'SPIN_COMPLETE', {
          playerId: player.id,
          playerName: player.name,
          game: chosen,
          rotation: finishedWheel.startRotation + finishedWheel.delta
        });
        socket.emit('session:command', {
          type: 'SPIN_COMPLETE',
          payload: {
            game: chosen,
            rotation: finishedWheel.startRotation + finishedWheel.delta
          }
        });
        broadcastState(session);

        setTimeout(() => {
          // Only this player's loading state is relevant to their phone.
          if (session.activeGroup || session.publicPhase?.type !== 'LOADING_GAMES') return;
          session.publicPhase = {
            type: 'LOADING_GAMES',
            game: chosen,
            playerId: player.id,
            playerName: player.name || 'Player',
            startedAt: Date.now()
          };
          broadcastState(session);
        }, LOADING_GAMES_DURATION);
      }, SPIN_DURATION);
      return;
    }

    if (type === 'JOINED_QUEUE') {
      player.mode = payload.mode || 'Single Player';
      player.status = 'QUEUED';
      if (!session.queue.includes(player.id)) session.queue.push(player.id);
      emitPublic(session, type, { playerId: player.id, player: publicPlayer(player) });
      broadcastState(session);
      // Single-player can begin automatically. Multiplayer is host-controlled.
      if (player.mode === 'Single Player') startNextGroup(session);
      return;
    }

    if (type === 'GAME_EVENT') {
      if (!session.activeGroup?.players.some(p => p.id === player.id)) return;
      const data = session.gameDataByPlayer?.get(player.id);
      if (!data) return;

      if (data.game === 'Debug Dash' && type === 'GAME_EVENT' && payload.action === 'DEBUG_LINE') {
        if (data.completed) return;
        const clicked = Number(payload.line);
        if (clicked === data.targetLine) {
          data.scores[player.id] = (data.scores[player.id] || 0) + (data.level * 100);
          if (data.level >= 4) {
            data.completed = true; data.status = 'SUCCESS'; data.message = `${player.name} cleared the boss level!`;
            finishActiveGroup(session, { score: data.scores[player.id], scores: data.scores });
            return;
          }
          data.level += 1; const next = debugLevel(data.level, data);
          if (!next) { data.completed = true; data.status = 'SUCCESS'; data.message = `${player.name} cleared the final level!`; finishActiveGroup(session, { score: data.scores[player.id], scores: data.scores, reason: 'COMPLETED' }); return; }
          data.targetLine = next.targetLine; data.code = next.code; data.message = next.message; data.timeLimit = Math.max(20, 27 - data.level);
        } else {
          data.scores[player.id] = Math.max(0, (data.scores[player.id] || 0) - 50);
          data.message = 'Bug got you — debugging is a skill you learn!';
        }
      }

      if (data.game === 'Guess The Output') {
        if (payload.action === 'BUZZ') {
          if (!data.buzzedBy) data.buzzedBy = player.id;
        }
        if (payload.action === 'ANSWER') {
          if (activeCanAnswer(data, player.id) && Array.isArray(data.options) && data.options.includes(payload.answer)) {
            const correct = payload.answer === data.correctAnswer;
            data.selected = payload.answer;
            data.lastAnswerCorrect = correct;
            if (correct) {
              data.scores[player.id] = Math.max(0, (data.scores[player.id] || 0) + data.level * 100);
              data.message = `${player.name} got it right! +${data.level * 100}`;
              data.buzzedBy = null;
              if (data.level >= 4) {
                data.completed = true;
                data.status = 'SUCCESS';
                finishActiveGroup(session, { score: data.scores[player.id], scores: data.scores, reason: 'COMPLETED' });
                return;
              }
              data.level += 1;
              const next = guessLevel(data.level, data);
              if (!next) { data.completed = true; data.status = 'SUCCESS'; finishActiveGroup(session, { score: data.scores[player.id], scores: data.scores, reason: 'COMPLETED' }); return; }
              data.question = next.question;
              data.options = next.options;
              data.correctAnswer = next.correctAnswer;
              data.selected = null;
              data.lastAnswerCorrect = null;
              data.message = data.mode === 'Single Player' ? `Level ${data.level} — choose your answer` : `Level ${data.level} — buzz in!`;
            } else {
              // Wrong answers are verified immediately, cost 50, but never make
              // the player's score negative. In multiplayer the buzzer opens again.
              data.scores[player.id] = Math.max(0, (data.scores[player.id] || 0) - 50);
              data.message = `${player.name} missed it. Try again.`;
              data.buzzedBy = null;
            }
          }
        }
      }

      if (data.game === 'Robot Rescue') {
        if (payload.action === 'ROBOT_PROGRAM') {
          const allowed = ['up', 'down', 'forward', 'backward', 'left', 'right'];
          data.program = Array.isArray(payload.commands) ? payload.commands.filter(c => allowed.includes(c)) : [];
          data.commands = [...data.program];
          data.status = 'PROGRAMMED';
        }

        if (payload.action === 'ROBOT_RUN') {
          if (data.executing || data.completed || !data.program?.length) return;
          data.executing = true;
          data.status = 'RUNNING';
          data.runIndex = 0;
          const activePlayer = player.id;
          const run = () => {
            if (!session.activeGroup || !session.gameDataByPlayer?.get(activePlayer) || session.gameDataByPlayer.get(activePlayer) !== data || data.completed) return;
            const command = data.program[data.runIndex];
            if (!command) {
              data.executing = false;
              data.status = 'READY';
              // A program is a one-shot run. Clear it after execution so the next
              // program the player builds cannot accidentally replay the previous run.
              data.program = [];
              data.commands = [];
              data.runIndex = 0;
              emitPublic(session, 'GAME_EVENT', { playerId: activePlayer, action: 'ROBOT_RUN_COMPLETE', gameData: data });
              broadcastState(session);
              return;
            }
            data.commands = data.program.slice(0, data.runIndex + 1);
            if (command === 'left') data.orientation = (data.orientation + 3) % 4;
            if (command === 'right') data.orientation = (data.orientation + 1) % 4;
            if (['up', 'down', 'forward', 'backward'].includes(command)) {
              const deltas = [[-1,0],[0,1],[1,0],[0,-1]];
              let direction;
              if (command === 'up') direction = 0;
              else if (command === 'down') direction = 2;
              else direction = command === 'backward' ? (data.orientation + 2) % 4 : data.orientation;
              const [dr, dc] = deltas[direction];
              const nr = data.row + dr, nc = data.col + dc;
              const obstacles = robotLevel(data.level, data).obstacles;
              const blocked = nr < 0 || nr > 4 || nc < 0 || nc > 4 || obstacles.includes(nr * 5 + nc);
              if (!blocked) {
                data.row = nr;
                data.col = nc;
                data.robot = nr * 5 + nc;
                data.path = [...new Set([...(data.path || []), data.robot])];
              }
            }
            data.runIndex += 1;

            if (data.robot === 24) {
              data.executing = false;
              data.scores[activePlayer] = (data.scores[activePlayer] || 0) + data.level * 125;
              if (data.level >= 4) {
                data.completed = true;
                data.status = 'SUCCESS';
                finishActiveGroup(session, { score: data.scores[activePlayer], scores: data.scores, reason: 'COMPLETED' });
                return;
              }
              data.level += 1;
              const next = robotLevel(data.level, data);
              if (!next) { data.completed = true; data.status = 'SUCCESS'; finishActiveGroup(session, { score: data.scores[activePlayer], scores: collectScores(session), reason: 'COMPLETED' }); return; }
              data.robot = 0;
              data.row = 0;
              data.col = 0;
              data.orientation = 1;
              data.path = [0];
              data.program = [];
              data.commands = [];
              data.runIndex = 0;
              data.status = 'READY';
              data.obstacles = next.obstacles;
              data.message = next.message;
              emitPublic(session, 'GAME_EVENT', { playerId: activePlayer, action: 'ROBOT_LEVEL_COMPLETE', gameData: data });
              broadcastState(session);
              return;
            }

            emitPublic(session, 'GAME_EVENT', { playerId: activePlayer, action: 'ROBOT_STEP', command, gameData: data });
            broadcastState(session);
            setTimeout(run, 450);
          };
          run();
        }
      }

      emitPublic(session, 'GAME_EVENT', { playerId: player.id, ...payload, gameData: data });
      broadcastState(session);
      return;
    }

    if (type === 'RESET_PLAYER') {
      if (session.activeGroup?.players.some(p => p.id === player.id)) return;
      session.queue = session.queue.filter(id => id !== player.id);
      player.name = ''; player.reason = ''; player.study = ''; player.interests = [];
      player.mode = 'Single Player'; player.game = ''; player.status = 'CONNECTED';
      session.publicPhase = { type: 'FILLING_FORMS', startedAt: Date.now() };
      broadcastState(session);
      return;
    }

    if (type === 'GAME_FINISHED') {
      finishActiveGroup(session, { score: payload.score ?? 0, scores: collectScores(session) });
    }
  });

  socket.on('disconnect', () => {
    const session = getSession(socket.data.sessionId);
    if (!session || socket.data.role !== 'player') return;
    const player = session.players.get(socket.data.playerId);
    if (!player) return;
    session.players.delete(player.id);
    session.queue = session.queue.filter(id => id !== player.id);
    if (session.activeGroup) session.activeGroup.players = session.activeGroup.players.filter(p => p.id !== player.id);
    emitPublic(session, 'PLAYER_DISCONNECTED', { playerId: player.id });
    broadcastState(session);
  });
});

const vite = await createViteServer({ root: __dirname, server: { middlewareMode: true, host: '0.0.0.0' }, appType: 'spa' });
app.use(vite.middlewares);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Spin the Wheel is running:`);
  console.log(`  Laptop:  http://localhost:${PORT}`);
  console.log(`  Phone:   http://${getLanIp()}:${PORT}`);
  console.log(`\n  Scan the QR shown on the laptop.\n`);
});
