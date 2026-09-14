import { useDetails } from '../../useDetails';
import { useConfirmation } from '../../components/useConfirmation';
import { useSensitiveAction } from './useSensitiveAction';
import { useState } from 'react';
import { useArcade } from '../../state';
import { Button, Field, Textarea } from '../../components/ui';
import { scoreText, gameById } from '../../../shared/catalog';
import { ReasonDialog } from './ReasonDialog';
export function Results() {
  const { state, busy } = useArcade(),
    [peopleOffset, setPeopleOffset] = useState(0),
    [attemptOffset, setAttemptOffset] = useState(0),
    [awardOffset, setAwardOffset] = useState(0),
    [query, setQuery] = useState(''),
    [dialog, setDialog] = useState(null),
    [selected, setSelected] = useState([]),
    [tieReason, setTieReason] = useState(''),
    [showAudit, setShowAudit] = useState(false);
  const { command, dialog: sensitiveDialog } = useSensitiveAction();
  const resource = useDetails('results', {
    q: query,
    people: peopleOffset,
    attempts: attemptOffset,
    awards: awardOffset,
  });
  const host = resource.data || {
    ...state.host,
    people: [],
    totals: { people: 0, attempts: 0, awards: 0 },
    leaderboard: state.leaderboard,
  };
  const [confirm, confirmation] = useConfirmation();
  const name = (id) => host.accounts.find((a) => a.id === id)?.fullName || 'Former participant';
  const found = host.people;
  return (
    <div>
      {confirmation}
      {resource.error && <p role="alert">{resource.error}</p>}
      {resource.loading && (
        <p role="status" className="text-sm">
          Loading results…
        </p>
      )}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-medium">Players & Results</h1>
        <Button secondary onClick={() => setShowAudit(!showAudit)}>
          Activity log
        </Button>
      </div>
      <details className="mb-6 rounded-lg border border-[#DDDDD5] p-4">
        <summary className="cursor-pointer text-sm font-medium">Attendance summary</summary>
        <p className="my-3 text-xs text-[#62625C]">
          Participants called for a solo turn or started in a live game. Groups smaller than five
          are combined.
        </p>
        {Object.entries(host.attendanceSummary).map(([label, count]) => (
          <p key={label} className="flex justify-between gap-4 py-2 text-sm">
            <span>{label}</span>
            <span>{count}</span>
          </p>
        ))}
      </details>
      <details className="mb-6 rounded-lg border border-[#DDDDD5] p-4">
        <summary className="cursor-pointer text-sm font-medium">Email delivery</summary>
        {host.mail
          .filter((m) => !m.sent)
          .map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                {m.error || 'Queued'} · {m.tries} attempts
              </span>
              {m.error && (
                <Button
                  secondary
                  disabled={busy}
                  onClick={() => command('host.retryMail', { id: m.id })}
                >
                  Retry
                </Button>
              )}
            </div>
          ))}
      </details>
      <Field
        label="Find participant"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPeopleOffset(0);
          setAttemptOffset(0);
        }}
        placeholder="Name, alias, email or course"
      />
      {
        <div className="my-5 space-y-3">
          {found.map((a) => (
            <div key={a.id} className="flex justify-between gap-5 rounded-lg bg-white p-4">
              <div>
                <p>
                  {a.fullName} <span className="text-sm text-[#62625C]">{a.alias}</span>
                </p>
                <p className="text-sm">
                  {a.course} · {a.level}
                </p>
                <p className="text-sm text-[#62625C]">
                  {a.email} · {a.used}/3 attempts
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  secondary
                  onClick={() =>
                    command('host.assistedEnqueue', {
                      accountId: a.id,
                      mode: 'practice',
                      identityConfirmed: true,
                    })
                  }
                >
                  Queue practice
                </Button>
                <Button
                  secondary
                  onClick={() =>
                    command('host.assistedEnqueue', {
                      accountId: a.id,
                      mode: 'ranked',
                      identityConfirmed: true,
                    })
                  }
                >
                  Queue ranked
                </Button>
              </div>
            </div>
          ))}
        </div>
      }
      <p className="text-xs text-[#62625C]">{host.totals.people} participants</p>
      <div className="flex gap-3">
        {peopleOffset > 0 && (
          <Button secondary onClick={() => setPeopleOffset(Math.max(0, peopleOffset - 30))}>
            Previous participants
          </Button>
        )}
        {peopleOffset + 30 < host.totals.people && (
          <Button secondary onClick={() => setPeopleOffset(peopleOffset + 30)}>
            Next participants
          </Button>
        )}
      </div>
      <div className="my-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[#62625C]">
            <tr>
              {['Player', 'Game / mode', 'Score', 'Status', ''].map((h, i) => (
                <th key={i} className="border-b border-[#DDDDD5] py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {host.attempts.map((a) => (
              <tr key={a.id}>
                <td className="border-b border-[#DDDDD5] py-4">{name(a.accountId)}</td>
                <td className="border-b border-[#DDDDD5] py-4">
                  {gameById(a.gameId)?.name}
                  <br />
                  <span className="text-xs text-[#62625C]">{a.mode}</span>
                </td>
                <td className="border-b border-[#DDDDD5] py-4 tabular-nums">
                  {scoreText(a.score)}
                </td>
                <td className="border-b border-[#DDDDD5] py-4">{a.status.replace('_', ' ')}</td>
                <td className="border-b border-[#DDDDD5] py-4">
                  {a.status !== 'started' && a.status !== 'voided' && (
                    <button
                      className="min-h-11 text-[#A33030] underline"
                      onClick={() =>
                        setDialog({
                          title: 'Void technical attempt',
                          action: 'host.void',
                          payload: { attemptId: a.id },
                        })
                      }
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3">
        {attemptOffset > 0 && (
          <Button secondary onClick={() => setAttemptOffset(Math.max(0, attemptOffset - 100))}>
            Previous results
          </Button>
        )}
        {attemptOffset + 100 < host.totals.attempts && (
          <Button secondary onClick={() => setAttemptOffset(attemptOffset + 100)}>
            Next results
          </Button>
        )}
      </div>
      <section className="my-10">
        <h2 className="mb-5 text-xl font-medium">Prize collection</h2>
        {host.awards.length ? (
          host.awards.map((a) => (
            <div key={a.id} className="flex justify-between gap-5 border-b border-[#DDDDD5] py-4">
              <div>
                <p>
                  {name(a.accountId)} · {a.type}
                </p>
                <p className="mt-1 font-mono text-xs text-[#62625C]">{a.id.slice(0, 8)}</p>
              </div>
              <Button
                secondary
                disabled={busy || a.collected || a.forfeited}
                onClick={async () => {
                  if (await confirm('Have you confirmed the claimant and their account identity?'))
                    command('host.collect', { id: a.id, identityConfirmed: true });
                }}
              >
                {a.collected ? 'Collected' : a.forfeited ? 'Closed' : 'Confirm collection'}
              </Button>
              {!a.collected && !a.forfeited && (
                <button
                  className="text-sm underline"
                  onClick={() =>
                    setDialog({
                      title: 'Close unclaimed award',
                      action: 'host.forfeitAward',
                      payload: { id: a.id },
                      minimum: 20,
                    })
                  }
                >
                  Close unclaimed
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-[#62625C]">No awards yet.</p>
        )}
      </section>
      <div className="flex gap-3">
        {awardOffset > 0 && (
          <Button secondary onClick={() => setAwardOffset(Math.max(0, awardOffset - 50))}>
            Previous prizes
          </Button>
        )}
        {awardOffset + 50 < host.totals.awards && (
          <Button secondary onClick={() => setAwardOffset(awardOffset + 50)}>
            Next prizes
          </Button>
        )}
      </div>
      <section className="space-y-4 border-t border-[#DDDDD5] pt-6">
        <h2 className="text-xl font-medium">Finalise Ranked</h2>
        <p className="text-sm text-[#62625C]">
          Complete admitted turns and resolve incidents first. If a tie crosses the prize boundary,
          select the tied recipients after the published playoff or witnessed draw.
        </p>
        <div className="flex flex-wrap gap-4">
          {host.leaderboard
            .filter((r) => r.score === host.leaderboard[2]?.score)
            .map((r) => (
              <label key={r.accountId} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(r.accountId)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, r.accountId]
                        : selected.filter((id) => id !== r.accountId),
                    )
                  }
                />
                {r.alias}
              </label>
            ))}
        </div>
        <Textarea
          label="Adjudication record, if needed"
          value={tieReason}
          onChange={(e) => setTieReason(e.target.value)}
        />
        <div className="flex gap-3">
          <Button
            disabled={busy || state.config.finalised}
            onClick={() => command('host.finalise', { winnerIds: selected, reason: tieReason })}
          >
            {state.config.finalised ? 'Finalised' : 'Finalise winners'}
          </Button>
          {state.config.finalised && (
            <Button
              secondary
              onClick={() =>
                setDialog({ title: 'Reopen results', action: 'host.reopen', payload: {} })
              }
            >
              Reopen for correction
            </Button>
          )}
        </div>
      </section>
      <section className="mt-10">
        <Button
          secondary
          onClick={() =>
            setDialog({
              title: 'Delete personal data after prize distribution',
              action: 'host.purge',
              payload: { confirmation: 'DELETE PERSONAL DATA' },
              minimum: 20,
            })
          }
        >
          Retention cleanup
        </Button>
        <p className="mt-2 text-xs text-[#62625C]">
          Irreversible. Resolve prizes and reach the configured cleanup date first.
        </p>
      </section>
      {showAudit && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-medium">Recent activity</h2>
          {[...host.audit].reverse().map((e) => (
            <p key={e.id} className="border-b border-[#DDDDD5] py-3 text-sm">
              <span className="mr-4 text-[#62625C]">{new Date(e.at).toLocaleString()}</span>
              {e.action} {e.detail?.reason}
            </p>
          ))}
        </section>
      )}
      {sensitiveDialog}
      <Button
        secondary
        disabled={busy}
        onClick={async () => {
          const r = await command('host.export');
          if (r?.csv) {
            const url = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ranked-results.csv';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        }}
      >
        Export ranked results
      </Button>
      {dialog && <ReasonDialog execute={command} dialog={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
