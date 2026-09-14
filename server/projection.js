import { estimatedWaitMs, canStartLive, liveDue } from './runtime.js';
import { sessionFor, hash } from './security.js';
import { leaderboard, openWindow } from './state.js';
import { publicGame } from './games.js';
import { publicLive } from './engine.js';
const cached = new WeakMap();
export function commonView(s) {
  if (!cached.has(s)) cached.set(s, { rows: leaderboard(s) });
  return cached.get(s);
}
export function project(s, token, now, origin, connectionId = null, { lean = false } = {}) {
  const session = sessionFor(s, token, now),
    account = s.accounts[session?.accountId],
    staff = s.staff[session?.staffId];
  const rows = commonView(s).rows,
    config = s.config,
    queue = s.queue.slice().sort((a, b) => a.sequence - b.sequence);
  const w = openWindow(s, now);
  const view = {
    revision: s.revision,
    now,
    origin,
    eventId: s.id,
    title: config.title,
    config: {
      policyVersion: config.policyVersion,
      paused: config.paused,
      nextLobbyAt: config.nextLobbyAt,
      autoLive: config.autoLive,
      liveAdmissionOpen: canStartLive(s, now),
      livePending: config.livePending,
      idlePresentation: config.idlePresentation,
      animateIdleWheel: config.animateIdleWheel,
      windows: config.windows,
    },
    open: !!w && now < w.cutoff && !config.paused && !s.purgedAt,
    admissionsReason: s.purgedAt
      ? 'This event has ended.'
      : config.paused
        ? 'The host has paused admissions.'
        : !w || now >= w.cutoff
          ? 'Outside opening hours.'
          : null,
    leaderboard: lean ? rows.slice(0, 20) : rows,
    active: s.active
      ? {
          phase: s.active.phase,
          selection: s.active.selection,
          accountId: s.active.accountId,
          alias: s.accounts[s.active.accountId]?.alias,
          mode: 'solo',
          gameId: s.active.phase === 'wheel' ? null : s.active.gameId,
          until: s.active.until,
          attemptId: s.active.attemptId,
          game: publicGame(s.active.game, account?.id === s.active.accountId),
        }
      : null,
    live: publicLive(s.live),
    next: queue.slice(0, 2).map((q) => ({ alias: s.accounts[q.accountId]?.alias })),
    updates: s.updates
      .filter((u) => !u.archived)
      .map(({ id, title, body, at, edited }) => ({ id, title, body, at, edited })),
    me: null,
  };
  if (view.live)
    view.live.roster = view.live.roster.map((e) => ({
      ...e,
      alias: s.accounts[e.accountId]?.alias,
    }));
  if (account) {
    const position = queue.findIndex((q) => q.accountId === account.id);
    view.me = {
      id: account.id,
      alias: account.alias,
      fullName: account.fullName || '',
      inputOwned: account.inputConnection === connectionId && account.inputSession === hash(token),
      turnNotice: account.turnNotice,
      unreadUpdates: s.updates.some(
        (u) => !u.archived && (u.edited || u.at) > (account.updatesReadAt || 0),
      ),
      rank: rows.find((r) => r.accountId === account.id) || null,
      queue:
        position < 0
          ? null
          : {
              position: position + 1,
              estimateMinutes: config.paused
                ? null
                : Math.ceil(estimatedWaitMs(s, position + (s.active ? 1 : 0)) / 60000),
            },
      attempts: s.attempts
        .filter((a) => a.accountId === account.id && (!lean || a.id === s.active?.attemptId))
        .map(({ review, _history, ...a }) => ({ ...a, review: lean ? undefined : review })),
      liveEntry: s.live?.roster[account.id]
        ? {
            submitted: s.live.roster[account.id].answer !== null,
            answer: s.live.roster[account.id].answer,
          }
        : null,
    };
  }
  if (staff) {
    const owned =
      s.hostLease?.session === hash(token) &&
      s.hostLease.connection === connectionId &&
      s.hostLease.expires > now;
    view.staff = {
      id: staff.id,
      username: staff.username,
      role: staff.role,
      epoch: s.controlEpoch,
      ownsControl: owned,
      leaseTab: s.hostLease?.tabId,
      controlExpires: owned ? null : s.hostLease?.expires,
      reauthenticated: session.reauthenticated,
    };
    view.host = {
      config,
      callBlockedReason: s.active
        ? 'Finish the current turn first.'
        : s.live
          ? 'The Live game is in progress.'
          : config.paused
            ? 'Admissions are paused. Resume when ready.'
            : liveDue(s, now)
              ? 'The scheduled Live lobby is due.'
              : !queue.length
                ? 'No players are waiting.'
                : null,
      queue: queue.map((q) => ({ ...q, alias: s.accounts[q.accountId]?.alias })),
      incidents: s.incidents,
      accounts: lean
        ? []
        : Object.values(s.accounts).map(({ id, alias, fullName }) => ({ id, alias, fullName })),
      attempts: lean ? [] : s.attempts,
      updates: s.updates,
    };
  }
  return view;
}
