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
      requireVerification: true,
      policyVersion: 1,
      paused: false,
      rankedEnabled: false,
      capacity: 30,
      interval: 300,
      lobbySeconds: 20,
      liveTimeScale: 1,
      idlePresentation: 'both',
      animateIdleWheel: true,
      livePending: false,
      releaseVersion: '1.0.0',
      resultSeconds: 6,
      autoLive: false,
      nextLobbyAt: now + 300000,
      soloAfterLive: false,
      windows: [],
      finalised: false,
      playoffAt: '',
      playoffLocation: '',
      replyDeadline: '',
      prizeInstructions: '',
      cleanupAt: '',
      instantPrizes: 50,
      retentionDays: 14,
      scoringVersion: SCORING_VERSION,
    },
  };
}
export function openWindow(state, now) {
  return state.config.windows.find((w) => now >= w.start && now < w.end);
}
export function leaderboard(state) {
  const best = new Map();
  for (const attempt of state.attempts) {
    if (
      attempt.mode !== 'ranked' ||
      !['completed', 'timed_out', 'abandoned'].includes(attempt.status) ||
      attempt.version !== SCORING_VERSION
    )
      continue;
    const old = best.get(attempt.accountId);
    if (!old || attempt.score > old.score) best.set(attempt.accountId, attempt);
  }
  const sorted = [...best.values()].sort((a, b) => b.score - a.score || a.ended - b.ended);
  let rank = 0,
    last = -1;
  return sorted.map((a, i) => {
    if (a.score !== last) rank = i + 1;
    last = a.score;
    return {
      accountId: a.accountId,
      alias: state.accounts[a.accountId]?.alias || 'Former participant',
      score: a.score,
      rank,
    };
  });
}
export function usedAttempts(state, id) {
  return state.attempts.filter(
    (a) => a.accountId === id && a.mode === 'ranked' && a.status !== 'voided',
  ).length;
}
export function log(state, actor, action, detail, now) {
  state.audit.push({ id: crypto.randomUUID(), actor, action, detail, at: now });
}
