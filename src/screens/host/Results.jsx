import { useState } from 'react';
import { useArcade } from '../../state';
import { Button, Field, Textarea } from '../../components/ui';
import { scoreText, gameById } from '../../../shared/catalog';
import { ReasonDialog } from './ReasonDialog';
export function Results() {
  const { state, command, busy } = useArcade(),
    [query, setQuery] = useState(''),
    [dialog, setDialog] = useState(null),
    [selected, setSelected] = useState([]),
    [tieReason, setTieReason] = useState(''),
    [showAudit, setShowAudit] = useState(false);
  const host = state.host;
  const name = (id) => host.accounts.find((a) => a.id === id)?.alias || 'Former participant';
  const found = host.accounts.filter((a) =>
    `${a.alias} ${a.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-medium">Results & prizes</h1>
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
      <Field
        label="Find participant"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Alias or email"
      />
      {query && (
        <div className="my-5 space-y-3">
          {found.slice(0, 8).map((a) => (
            <div key={a.id} className="flex justify-between gap-5 rounded-lg bg-white p-4">
              <div>
                <p>{a.alias}</p>
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
                <Button
                  secondary
                  onClick={() => command('host.pair', { accountId: a.id, identityConfirmed: true })}
                >
                  Pair controller
                </Button>
                <Button
                  secondary
                  onClick={() =>
                    setDialog({
                      title: 'Recover participant account',
                      action: 'host.resolveIdentity',
                      payload: { accountId: a.id, identityConfirmed: true },
                      minimum: 20,
                    })
                  }
                >
                  Assist recovery
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
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
            {[...host.attempts]
              .reverse()
              .filter((a) => !query || found.some((f) => f.id === a.accountId))
              .slice(0, 100)
              .map((a) => (
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
                onClick={() => {
                  if (confirm('Have you confirmed the claimant and their account identity?'))
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
      <section className="space-y-4 border-t border-[#DDDDD5] pt-6">
        <h2 className="text-xl font-medium">Finalise Ranked</h2>
        <p className="text-sm text-[#62625C]">
          Complete admitted turns and resolve incidents first. If a tie crosses the prize boundary,
          select the tied recipients after the published playoff or witnessed draw.
        </p>
        <div className="flex flex-wrap gap-4">
          {state.leaderboard
            .filter((r) => r.score === state.leaderboard[2]?.score)
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
          onClick={() => {
            const reason = prompt(
              'After prize collection and the correction period: why are you deleting personal data?',
            );
            if (
              reason &&
              confirm('Delete personal data and sign out all accounts? This is irreversible.')
            )
              command('host.purge', { reason, confirmation: 'DELETE PERSONAL DATA' });
          }}
        >
          Retention cleanup
        </Button>
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
      {dialog && <ReasonDialog dialog={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
