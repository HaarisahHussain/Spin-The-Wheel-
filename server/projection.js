import { estimatedWaitMs } from './runtime.js';
import { sessionFor, hash } from './security.js';
import { attendanceSummary } from './attendance.js';
import { leaderboard, usedAttempts, openWindow } from './state.js';
import { publicGame } from './games.js';
import { canStartLive, liveDue } from './runtime.js';
import { publicLive, eligible } from './engine.js';
export function project(s, token, now, origin, connectionId = null) {
  const session = sessionFor(s, token, now),
    account = session?.accountId ? s.accounts[session.accountId] : null;
  const staff = session?.staffId ? s.staff[session.staffId] : null;
  const rows = s.config.finalised ? s.finalStandings : leaderboard(s),
    queue = s.queue.slice().sort((a, b) => a.sequence - b.sequence);
  const active = s.active
    ? {
        phase: s.active.phase,
        selection: s.active.selection,
        accountId: s.active.accountId,
        alias: s.accounts[s.active.accountId]?.alias,
        mode: s.active.mode,
        gameId: s.active.phase === 'wheel' ? null : s.active.gameId,
        until: s.active.until,
        attemptId: s.active.attemptId,
        game: publicGame(s.active.game, account?.id === s.active.accountId),
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
      prototypeGames: config.prototypeGames,
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
    open:
      !!openWindow(s, now) &&
      now < openWindow(s, now).cutoff &&
      !config.paused &&
      !config.finalised,
    admissionsReason: s.config.finalised
      ? 'This event has finished.'
      : s.config.paused
        ? 'The host has paused admissions.'
        : !openWindow(s, now) || now >= openWindow(s, now).cutoff
          ? 'Outside opening hours.'
          : null,
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
        controller: false,
        profileEditable: !account.attendedAt,
        unreadUpdates: s.updates.some(
          (u) => !u.archived && (u.edited || u.at) > (account.updatesReadAt || 0),
        ),
        notifications: s.notifications.filter((n) => n.accountId === account.id && !n.acknowledged),
        fullName: account.fullName,
        course: account.course,
        level: account.level,
        inputOwned:
          account.inputConnection === connectionId && account.inputSession === hash(token),
        liveResults: s.liveResults
          .filter((r) => r.accountId === account.id)
          .slice(-20)
          .reverse(),
        email: session.controller ? undefined : account.email,
        alias: account.alias,
        turnNotice: account.turnNotice,
        verification: session.controller
          ? undefined
          : (() => {
              const challenge = Object.values(s.challenges)
                .filter((c) => c.accountId === account.id && c.kind === 'verify' && !c.used)
                .at(-1);
              const job = s.outbox.find((j) => j.challengeId === challenge?.id);
              return {
                resendAt: challenge ? challenge.expires - 840000 : 0,
                status: job?.sent
                  ? 'Sent'
                  : job?.error
                    ? 'Delivery delayed'
                    : job
                      ? 'Queued'
                      : 'Not requested',
              };
            })(),
        verified: account.verified,
        eligible: eligible(s, account),
        used: usedAttempts(s, account.id),
        queue:
          position < 0
            ? null
            : {
                ...queue[position],
                position:
                  queue.slice(0, position).filter((q) => eligible(s, s.accounts[q.accountId]))
                    .length + 1,
                waitingForVerification: !eligible(s, account),
                estimateMinutes: config.paused
                  ? null
                  : Math.ceil(
                      estimatedWaitMs(
                        s,
                        queue.slice(0, position).filter((q) => eligible(s, s.accounts[q.accountId]))
                          .length + (s.active ? 1 : 0),
                      ) / 60000,
                    ),
              },
        attempts: session.controller
          ? []
          : s.attempts
              .filter((a) => a.accountId === account.id)
              .map(
                ({
                  id,
                  accountId,
                  gameId,
                  mode,
                  status,
                  score,
                  started,
                  ended,
                  version,
                  breakdown,
                  personalBest,
                  firstScore,
                  improvement,
                  review,
                }) => ({
                  id,
                  accountId,
                  gameId,
                  mode,
                  status,
                  score,
                  started,
                  ended,
                  version,
                  breakdown,
                  personalBest,
                  firstScore,
                  improvement,
                  review,
                }),
              ),
        awards: s.awards
          .filter((a) => a.accountId === account.id)
          .map((a) => ({
            ...a,
            instructions: s.config.prizeInstructions,
            mailStatus: (() => {
              const m = s.outbox.find((m) => m.awardId === a.id);
              return m?.sent ? 'sent' : m?.tries >= 5 ? 'failed' : 'queued';
            })(),
          })),
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
    view.staff = {
      id: staff.id,
      username: staff.username,
      role: staff.role,
      epoch: s.controlEpoch,
      ownsControl:
        s.hostLease?.session === hash(token) &&
        s.hostLease.connection === connectionId &&
        s.hostLease.expires > now,
      leaseTab: s.hostLease?.tabId,
      controlExpires: s.hostLease?.expires,
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
              : !queue.some((q) => eligible(s, s.accounts[q.accountId]))
                ? queue.length
                  ? 'Waiting players need email verification.'
                  : 'No players are waiting.'
                : null,
      queue: queue.map((q) => ({
        ...q,
        alias: s.accounts[q.accountId]?.alias,
        verified: s.accounts[q.accountId]?.verified,
      })),
      accounts: Object.values(s.accounts).map(
        ({ id, fullName, email, alias, course, level, verified, disabled }) => ({
          id,
          fullName,
          email,
          alias,
          course,
          level,
          verified,
          disabled,
          used: usedAttempts(s, id),
        }),
      ),
      attempts: s.attempts.map(
        ({
          id,
          accountId,
          gameId,
          mode,
          status,
          score,
          started,
          ended,
          version,
          breakdown,
          personalBest,
          firstScore,
          review,
        }) => ({
          id,
          accountId,
          gameId,
          mode,
          status,
          score,
          started,
          ended,
          version,
          breakdown,
          personalBest,
          firstScore,
          review,
        }),
      ),
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
