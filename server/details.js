import { commonView } from './projection.js';
import { sessionFor, requireValue as assert } from './security.js';
import { sessionResults } from './state.js';
const page = (n) => Math.min(100000, Math.max(0, Math.trunc(Number(n) || 0)));
const summary = ({ history: _history, review, breakdown: _breakdown, ...a }) => ({
  ...a,
  hasReview: !!review?.length,
});
export function details(s, token, now, query) {
  const session = sessionFor(s, token, now),
    accountId = session?.accountId,
    host = session?.staffId === 'host';
  const rows = commonView(s).rows;
  if (query.section === 'leaderboard')
    return { rows: rows.slice(page(query.offset), page(query.offset) + 50), total: rows.length };
  assert(accountId || host, 'This session has expired. Reload to play.', 401);
  if (query.section === 'review') {
    const a = s.attempts.find((a) => a.id === query.id);
    assert(a && (host || a.accountId === accountId), 'Session not found.', 404);
    return { review: a.review || [] };
  }
  if (query.section === 'scores') {
    assert(accountId, 'Player account required.', 403);
    const all = sessionResults(s).filter((a) => a.accountId === accountId);
    return {
      best: all
        .filter((a) => !query.game || query.game === 'all' || a.gameId === query.game)
        .sort((a, b) => b.score - a.score || a.ended - b.ended)
        .slice(0, 10)
        .map(summary),
      recent: all
        .sort((a, b) => b.ended - a.ended)
        .slice(0, 10)
        .map(summary),
    };
  }
  assert(host && query.section === 'results', 'Host access required.', 403);
  const q = String(query.q || '')
    .slice(0, 120)
    .toLowerCase();
  const people = Object.values(s.accounts).filter((a) =>
    `${a.id} ${a.alias} ${a.fullName || ''}`.toLowerCase().includes(q),
  );
  const ids = new Set(people.map((a) => a.id));
  const all = [
    ...s.attempts,
    ...s.liveResults.map((a) => ({ ...a, mode: 'live', status: 'completed', ended: a.at })),
  ];
  const attempts = all
    .filter(
      (a) =>
        (!q || ids.has(a.accountId)) &&
        (!query.mode || query.mode === 'all' || a.mode === query.mode),
    )
    .sort((a, b) => (b.started || b.ended || 0) - (a.started || a.ended || 0));
  const selectedPeople = people.slice(page(query.people), page(query.people) + 30),
    selectedAttempts = attempts.slice(page(query.attempts), page(query.attempts) + 100);
  const referenced = new Set([
    ...selectedPeople.map((a) => a.id),
    ...selectedAttempts.map((a) => a.accountId),
  ]);
  const accounts = [...referenced]
    .map((id) => s.accounts[id])
    .filter(Boolean)
    .map(({ id, alias, fullName }) => ({ id, alias, fullName }));
  return {
    people: accounts.filter((a) => selectedPeople.some((p) => p.id === a.id)),
    accounts,
    attempts: selectedAttempts.map(summary),
    totals: { people: people.length, attempts: attempts.length },
    audit: s.audit.slice(-100),
  };
}
