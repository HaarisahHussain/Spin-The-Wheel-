import { SCORING_VERSION } from '../shared/catalog.js';
export function initialState(now = Date.now()) {
  return {
    revision: 0,
    id: crypto.randomUUID(),
    accounts: {},
    sessions: {},
    staff: { host: { id: 'host', username: 'host', role: 'host' } },
    controlEpoch: 0,
    hostLease: null,
    takeovers: {},
    notifications: [],
    liveResults: [],
    schemaVersion: 7,
    challenges: {},
    rates: {},
    commands: {},
    outbox: [],
    audit: [],
    queue: [],
    attempts: [],
    updates: [],
    awards: [],
    incidents: [],
    active: null,
    live: null,
    nextSequence: 1,
    config: {
      title: 'BCUSCA Arcade',
      policyVersion: 1,
      paused: false,
      capacity: 30,
      interval: 300,
      lobbySeconds: 20,
      liveTimeScale: 1,
      idlePresentation: 'both',
      animateIdleWheel: true,
      livePending: false,
      releaseVersion: '1.1.0',
      resultSeconds: 6,
      autoLive: false,
      nextLobbyAt: now + 300000,
      soloAfterLive: false,
      windows: [],
      cleanupAt: '',
      scoringVersion: SCORING_VERSION,
    },
  };
}
export function openWindow(state, now) {
  return state.config.windows.find((w) => now >= w.start && now < w.end);
}
export function sessionResults(state) {
  return [
    ...state.attempts.filter((a) => ['completed', 'timed_out', 'abandoned'].includes(a.status)),
    ...state.liveResults.map((a) => ({ ...a, mode: 'live', status: 'completed', ended: a.at })),
  ];
}
export function leaderboard(state) {
  const best = new Map();
  for (const a of sessionResults(state)) {
    if (!state.accounts[a.accountId]) continue;
    const old = best.get(a.accountId);
    if (!old || a.score > old.score || (a.score === old.score && a.ended < old.ended))
      best.set(a.accountId, a);
  }
  const sorted = [...best.values()].sort(
    (a, b) => b.score - a.score || a.ended - b.ended || a.accountId.localeCompare(b.accountId),
  );
  let rank = 0,
    last = -1;
  return sorted.map((a, i) => {
    if (a.score !== last) rank = i + 1;
    last = a.score;
    return {
      accountId: a.accountId,
      alias: state.accounts[a.accountId].alias,
      score: a.score,
      rank,
      gameId: a.gameId,
      mode: a.mode,
    };
  });
}
export function log(state, actor, action, detail, now) {
  state.audit.push({ id: crypto.randomUUID(), actor, action, detail, at: now });
}
