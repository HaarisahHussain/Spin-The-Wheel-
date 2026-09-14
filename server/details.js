import { commonView } from './projection.js';
import { sessionFor, requireValue as assert } from './security.js';
import { attendanceSummary } from './attendance.js';
import { SCORING_VERSION } from '../shared/catalog.js';
const page = (n) => Math.min(100000, Math.max(0, Math.trunc(Number(n) || 0)));
const summary = ({ history: _history, review, breakdown: _breakdown, ...a }) => ({
  ...a,
  hasReview: !!review?.length,
});
export function details(s, token, now, query) {
  const session = sessionFor(s, token, now);
  const accountId = session?.accountId;
  const host = session?.staffId === 'host';
  const rows = commonView(s).rows;
  if (query.section === 'leaderboard')
    return { rows: rows.slice(page(query.offset), page(query.offset) + 50), total: rows.length };
  assert(accountId || host, 'Please sign in.', 401);
  if (query.section === 'review') {
    const a = s.attempts.find((a) => a.id === query.id);
    assert(a && (host || a.accountId === accountId), 'Session not found.', 404);
    return { review: a.review || [] };
  }
  if (query.section === 'scores') {
    assert(accountId, 'Please sign in as a player.', 403);
    const attempts = s.attempts.filter(
      (a) => a.accountId === accountId && a.version === SCORING_VERSION,
    );
    const practice = attempts
      .filter(
        (a) =>
          a.mode === 'practice' &&
          ['completed', 'timed_out', 'abandoned'].includes(a.status) &&
          (!query.game || query.game === 'all' || query.game === a.gameId),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(summary);
    return {
      practice,
      recent: attempts
        .filter((a) => a.review?.length)
        .slice(-10)
        .reverse()
        .map(summary),
    };
  }
  assert(host && query.section === 'results', 'Host access required.', 403);
  const search = String(query.q || '')
    .slice(0, 120)
    .toLowerCase();
  const people = Object.values(s.accounts).filter((a) =>
    `${a.id} ${a.alias} ${a.fullName} ${a.email} ${a.course} ${a.level}`
      .toLowerCase()
      .includes(search),
  );
  const ids = new Set(people.map((a) => a.id));
  const allAttempts =
    query.mode === 'live'
      ? s.liveResults.map((a) => ({
          ...a,
          mode: 'live',
          ended: a.at,
          status: a.won ? 'winner' : 'completed',
        }))
      : s.attempts;
  const attempts = allAttempts
    .filter((a) => (!search || ids.has(a.accountId)) && (!query.mode || a.mode === query.mode))
    .slice()
    .sort((a, b) => (b.started || b.ended || 0) - (a.started || a.ended || 0));
  const selectedPeople = people.slice(page(query.people), page(query.people) + 30);
  const selectedAttempts = attempts
    .slice(page(query.attempts), page(query.attempts) + 100)
    .map(summary);
  const matchingAwards = s.awards.filter((a) => !search || ids.has(a.accountId));
  const awards = matchingAwards
    .slice()
    .reverse()
    .slice(page(query.awards), page(query.awards) + 50);
  const referenced = new Set([
    ...selectedPeople.map((a) => a.id),
    ...selectedAttempts.map((a) => a.accountId),
    ...awards.map((a) => a.accountId),
    ...rows.filter((r, i) => i < 3 || r.score === rows[2]?.score).map((r) => r.accountId),
  ]);
  const accounts = [...referenced]
    .map((id) => s.accounts[id])
    .filter(Boolean)
    .map(({ id, fullName, email, alias, course, level, verified }) => ({
      id,
      fullName,
      email,
      alias,
      course,
      level,
      verified,
      used: commonView(s).used.get(id) || 0,
    }));
  return {
    people: accounts.filter((a) => selectedPeople.some((p) => p.id === a.id)),
    accounts,
    attempts: selectedAttempts,
    awards: awards.map((a) => {
      const job = s.outbox.find((m) => m.awardId === a.id && !m.cancelled);
      return {
        ...a,
        mailStatus:
          a.type !== 'grand'
            ? null
            : job?.sent
              ? 'sent'
              : job?.error
                ? 'failed'
                : job
                  ? 'queued'
                  : 'unavailable',
      };
    }),
    prizeSummary: {
      pending: s.awards.filter((a) => !a.collected && !a.forfeited).length,
      collected: s.awards.filter((a) => a.collected).length,
    },
    totals: { people: people.length, attempts: attempts.length, awards: matchingAwards.length },
    audit: s.audit.slice(-100),
    mail: s.outbox
      .filter((m) => !m.sent && !m.cancelled)
      .slice(0, 100)
      .map(({ id, sent, tries, error }) => ({ id, sent, tries, error })),
    attendanceSummary: s.attendanceSummary || attendanceSummary(s.accounts),
    // Include every boundary tie so finalisation remains usable even for a large tie.
    leaderboard: rows.filter((r, i) => i < 3 || r.score === rows[2]?.score),
  };
}
