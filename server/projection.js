import { sessionFor } from './security.js';
import { attendanceSummary } from './attendance.js';
import { leaderboard, usedAttempts, openWindow } from './state.js';
import { publicGame } from './games.js';
import { canStartLive } from './runtime.js';
import { publicLive, eligible } from './engine.js';
export function project(s, token, now, origin) {
  const session = sessionFor(s, token, now),
    account = session?.accountId ? s.accounts[session.accountId] : null;
  const staff = session?.staffId ? s.staff[session.staffId] : null;
  const rows = leaderboard(s),
    queue = s.queue.slice().sort((a, b) => a.sequence - b.sequence);
  const active = s.active
    ? {
        phase: s.active.phase,
        selection: s.active.selection,
        accountId: s.active.accountId,
        alias: s.accounts[s.active.accountId]?.alias,
        mode: s.active.mode,
        gameId: s.active.gameId,
        until: s.active.until,
        attemptId: s.active.attemptId,
        game: publicGame(s.active.game),
      }
    : null;
  const config = s.config;
  const view = {
    revision: s.revision,
    now,
    origin,
    eventId: s.id,
    title: config.title,
    config: {
      requireVerification: config.requireVerification,
      policyVersion: config.policyVersion,
      paused: config.paused,
      rankedEnabled: config.rankedEnabled,
      finalised: config.finalised,
      nextLobbyAt: config.nextLobbyAt,
      autoLive: config.autoLive,
      liveAdmissionOpen: canStartLive(s, now),
      livePending: config.livePending,
      idlePresentation: config.idlePresentation,
      animateIdleWheel: config.animateIdleWheel,
      windows: config.windows,
      playoffAt: config.playoffAt,
      playoffLocation: config.playoffLocation,
      replyDeadline: config.replyDeadline,
    },
    open: !!openWindow(s, now),
    leaderboard: rows,
    active,
    live: publicLive(s.live),
    next: queue
      .filter((q) => eligible(s, s.accounts[q.accountId]))
      .slice(0, 2)
      .map((q) => ({ alias: s.accounts[q.accountId]?.alias, mode: q.mode })),
    updates: s.updates
      .filter((u) => !u.archived)
      .map(({ id, title, body, at, edited }) => ({ id, title, body, at, edited })),
    me: null,
  };
  if (view.live)
    view.live.roster = view.live.roster.map((entry) => ({
      ...entry,
      alias: s.accounts[entry.accountId]?.alias,
    }));
  if (account) {
    if (session.pending)
      view.me = { id: account.id, email: account.email, pending: true, verified: false };
    else {
      const position = queue.findIndex((q) => q.accountId === account.id);
      view.me = {
        id: account.id,
        controller: !!session.controller,
        email: session.controller ? undefined : account.email,
        alias: account.alias,
        verified: account.verified,
        eligible: eligible(s, account),
        used: usedAttempts(s, account.id),
        queue: position < 0 ? null : { ...queue[position], position: position + 1 },
        attempts: session.controller
          ? []
          : s.attempts
              .filter((a) => a.accountId === account.id)
              .map(({ history: _history, ...rest }) => rest),
        awards: session.controller ? [] : s.awards.filter((a) => a.accountId === account.id),
        liveEntry: s.live?.roster[account.id]
          ? {
              submitted: s.live.roster[account.id].answer !== null,
              answer: s.live.roster[account.id].answer,
            }
          : null,
      };
    }
  }
  if (staff) {
    view.staff = { id: staff.id, username: staff.username, role: staff.role };
    view.host = {
      config,
      queue: queue.map((q) => ({
        ...q,
        alias: s.accounts[q.accountId]?.alias,
        verified: s.accounts[q.accountId]?.verified,
      })),
      accounts: Object.values(s.accounts).map(
        ({ id, email, alias, course, level, verified, disabled }) => ({
          id,
          email,
          alias,
          course,
          level,
          verified,
          disabled,
          used: usedAttempts(s, id),
        }),
      ),
      attempts: s.attempts.map(({ history: _history, ...rest }) => rest),
      incidents: s.incidents,
      awards: s.awards,
      audit: s.audit.slice(-100),
      updates: s.updates,
      mail: s.outbox.map(({ id, sent, tries, error }) => ({ id, sent, tries, error })),
      attendanceSummary: s.attendanceSummary || attendanceSummary(s.accounts),
    };
  }
  return view;
}
