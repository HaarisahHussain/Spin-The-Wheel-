import { useState } from 'react';
import { useDetails } from '../../useDetails';
import { useConfirmation } from '../../components/useConfirmation';
import { useSensitiveAction } from './useSensitiveAction';
import { useArcade } from '../../state';
import { Button, Field, Textarea } from '../../components/ui';
import { scoreText, gameById } from '../../../shared/catalog';
import { ReasonDialog } from './ReasonDialog';

const when = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(new Date(value))
    : '—';
function Identity({ account }) {
  if (!account) return <span>Former participant</span>;
  return (
    <div className="space-y-1">
      <p className="font-medium">{account.fullName}</p>
      <p className="text-xs text-[#62625C]">{account.alias}</p>
      <p className="break-all text-xs text-[#62625C]">{account.email}</p>
      <details className="text-xs text-[#62625C]">
        <summary className="cursor-pointer py-1">Account details</summary>
        <p>
          {account.course} · {account.level}
        </p>
        <p className="break-all">ID: {account.id}</p>
      </details>
    </div>
  );
}
function Pages({ offset, setOffset, size, total, label }) {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-[#62625C]">
      <span>
        {total ? `${offset + 1}–${Math.min(offset + size, total)} of ${total}` : `No ${label}`}
      </span>
      {offset > 0 && (
        <Button secondary onClick={() => setOffset(Math.max(0, offset - size))}>
          Previous {label}
        </Button>
      )}
      {offset + size < total && (
        <Button secondary onClick={() => setOffset(offset + size)}>
          Next {label}
        </Button>
      )}
    </div>
  );
}
export function Results() {
  const { state, busy } = useArcade();
  const [tab, setTab] = useState('sessions'),
    [mode, setMode] = useState('ranked');
  const [query, setQuery] = useState(''),
    [people, setPeople] = useState(0),
    [attempts, setAttempts] = useState(0),
    [awards, setAwards] = useState(0);
  const [dialog, setDialog] = useState(null),
    [selected, setSelected] = useState([]),
    [tieReason, setTieReason] = useState('');
  const { command, dialog: sensitiveDialog } = useSensitiveAction();
  const [confirm, confirmation] = useConfirmation();
  const resource = useDetails('results', { q: query, mode, people, attempts, awards });
  const data = resource.data;
  const account = (id) => data?.accounts.find((a) => a.id === id);
  const leaders = data?.leaderboard || [];
  const boundary = leaders[2]?.score;
  const tied = boundary === undefined ? [] : leaders.filter((r) => r.score === boundary);
  const above = leaders.filter((r) => r.score > boundary);
  const needsTie = above.length + tied.length > 3;
  const reason = (title, action, payload) => setDialog({ title, action, payload, minimum: 20 });
  const locked = busy || resource.loading || !!resource.error;
  return (
    <div className="space-y-6">
      {confirmation}
      {sensitiveDialog}
      <h1 className="text-3xl font-medium">Players & Results</h1>
      <nav aria-label="Results sections" className="flex flex-wrap gap-5 border-b border-[#DDDDD5]">
        {[
          ['sessions', 'Game sessions'],
          ['prizes', 'Prizes'],
          ['players', 'Players'],
          ['admin', 'Event records'],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? 'page' : undefined}
            className={`min-h-12 border-b-2 ${tab === id ? 'border-[#365E53] font-medium' : 'border-transparent text-[#62625C]'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab !== 'admin' && (
        <Field
          label="Find participant"
          placeholder="Name, alias, email or account ID"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPeople(0);
            setAttempts(0);
            setAwards(0);
          }}
        />
      )}
      {resource.loading && (
        <p role="status" className="text-sm">
          Updating…
        </p>
      )}
      {resource.error && <p role="alert">{resource.error}</p>}
      {data && tab === 'sessions' && (
        <>
          <div className="flex gap-3" aria-label="Game mode">
            {['ranked', 'practice', 'live'].map((m) => (
              <Button
                key={m}
                secondary={mode !== m}
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setAttempts(0);
                }}
              >
                {m === 'ranked'
                  ? 'Ranked'
                  : m === 'practice'
                    ? 'Practice · unranked'
                    : 'Live · unranked'}
              </Button>
            ))}
          </div>
          <p className="text-xs text-[#62625C]">
            UK time ·{' '}
            {mode === 'ranked'
              ? 'Ranked scores and used attempts cannot be voided.'
              : 'Unranked scores do not affect prizes on the Ranked leaderboard.'}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {['Player', 'Game', 'Started / finished', 'Score', 'Status', ''].map((h, i) => (
                    <th key={i} className="border-b border-[#DDDDD5] px-3 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="min-w-52 border-b border-[#DDDDD5] px-3 py-4">
                      <Identity account={account(a.accountId)} />
                    </td>
                    <td className="border-b border-[#DDDDD5] px-3 py-4">
                      {gameById(a.gameId)?.name || a.gameId}
                      <details className="mt-2 text-xs text-[#62625C]">
                        <summary>Session ID</summary>
                        <span className="break-all">{a.liveId || a.id}</span>
                      </details>
                    </td>
                    <td className="whitespace-nowrap border-b border-[#DDDDD5] px-3 py-4 text-xs">
                      <p>{when(a.started)}</p>
                      <p className="text-[#62625C]">{when(a.ended)}</p>
                    </td>
                    <td className="border-b border-[#DDDDD5] px-3 py-4 tabular-nums">
                      {mode === 'live'
                        ? `${(a.score / 1000000).toFixed(1)} pts`
                        : scoreText(a.score)}
                    </td>
                    <td className="border-b border-[#DDDDD5] px-3 py-4">
                      {a.resolution ? 'Interrupted · resolved' : a.status.replaceAll('_', ' ')}
                      {a.resolution && (
                        <p className="mt-2 text-xs text-[#62625C]">{a.resolution.reason}</p>
                      )}
                    </td>
                    <td className="border-b border-[#DDDDD5] px-3 py-4">
                      {a.status === 'interrupted' && (
                        <Button
                          secondary
                          disabled={locked || state.config.finalised}
                          onClick={() =>
                            reason(
                              'Resolve interruption — keep score and used attempt',
                              'host.resolveInterruption',
                              { attemptId: a.id },
                            )
                          }
                        >
                          Resolve interruption
                        </Button>
                      )}
                      {a.mode === 'practice' && !['started', 'voided'].includes(a.status) && (
                        <Button
                          secondary
                          disabled={locked || state.config.finalised}
                          onClick={() =>
                            reason('Void Practice session', 'host.void', { attemptId: a.id })
                          }
                        >
                          Void
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pages
            offset={attempts}
            setOffset={setAttempts}
            size={100}
            total={data.totals.attempts}
            label="results"
          />
        </>
      )}
      {data && tab === 'players' && (
        <>
          <p className="text-sm text-[#62625C]">
            Registered accounts. See Game sessions for who actually played.
          </p>
          {data.people.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg bg-white p-4"
            >
              <Identity account={a} />
              <div className="space-y-3">
                <p className="text-xs text-[#62625C]">
                  {a.used}/3 Ranked starts used · {a.verified ? 'Verified' : 'Not verified'}
                </p>
                <div className="flex gap-2">
                  {['practice', 'ranked'].map((m) => (
                    <Button
                      key={m}
                      secondary
                      disabled={locked || (m === 'ranked' && a.used >= 3)}
                      onClick={async () => {
                        if (
                          await confirm(
                            `Queue ${a.fullName} (${a.email}) for ${m}? Confirm this is the person at the stall.`,
                          )
                        )
                          command('host.assistedEnqueue', {
                            accountId: a.id,
                            mode: m,
                            identityConfirmed: true,
                          });
                      }}
                    >
                      Queue {m}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <Pages
            offset={people}
            setOffset={setPeople}
            size={30}
            total={data.totals.people}
            label="participants"
          />
        </>
      )}
      {data && tab === 'prizes' && (
        <>
          <section className="space-y-4 rounded-lg border border-[#DDDDD5] p-5">
            <h2 className="text-xl font-medium">
              {state.config.finalised ? 'Final Ranked standings' : 'Provisional Ranked leaders'}
            </h2>
            {!state.config.finalised && (
              <p className="text-sm text-[#62625C]">
                These positions can change. Finalise winners below to create grand prizes and notify
                players.
              </p>
            )}
            {!leaders.length && <p>No Ranked results yet.</p>}
            {leaders.map((r) => (
              <div
                key={r.accountId}
                className="flex items-start justify-between gap-4 border-t border-[#DDDDD5] pt-3"
              >
                <div className="flex gap-4">
                  <span className="tabular-nums">#{r.rank}</span>
                  <Identity account={account(r.accountId)} />
                </div>
                <span>{scoreText(r.score)}</span>
              </div>
            ))}
            {needsTie && !state.config.finalised && (
              <>
                <p className="text-sm">
                  Tie at the prize boundary. Select {3 - above.length} recipients after a witnessed
                  draw and record the outcome.
                </p>
                {tied.map((r) => (
                  <label key={r.accountId} className="flex items-center gap-3 text-sm">
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
                    {account(r.accountId)?.fullName} · {account(r.accountId)?.email}
                  </label>
                ))}
                <Textarea
                  label="Draw record"
                  value={tieReason}
                  onChange={(e) => setTieReason(e.target.value)}
                />
              </>
            )}
            <div className="flex gap-3">
              <Button
                disabled={locked || state.config.finalised || !leaders.length}
                onClick={async () => {
                  if (
                    await confirm(
                      'Close Ranked results and notify the confirmed prize winners? Finish all queued and active games first.',
                    )
                  )
                    command('host.finalise', {
                      winnerIds: needsTie ? selected : [],
                      reason: needsTie ? tieReason : '',
                    });
                }}
              >
                {state.config.finalised ? 'Winners finalised' : 'Finalise winners'}
              </Button>
              {state.config.finalised && (
                <Button
                  secondary
                  disabled={locked}
                  onClick={() => reason('Reopen prize decisions', 'host.reopen', {})}
                >
                  Reopen decisions
                </Button>
              )}
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-medium">Prize collection</h2>
            <p className="text-sm text-[#62625C]">
              {data.prizeSummary.pending} awaiting collection · {data.prizeSummary.collected}{' '}
              collected
            </p>
            {data.awards.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DDDDD5] py-4"
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {a.type === 'grand' ? 'Grand prize · Ranked' : 'Instant prize · Live'}
                  </p>
                  <Identity account={account(a.accountId)} />
                  <p className="text-xs text-[#62625C]">
                    Awarded {when(a.at)}
                    {a.collectedAt ? ` · Collected ${when(a.collectedAt)}` : ''}
                  </p>
                  {a.mailStatus && (
                    <p className="text-xs text-[#62625C]">
                      Email: {a.mailStatus === 'sent' ? 'sent to provider' : a.mailStatus}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    secondary
                    disabled={
                      locked ||
                      a.collected ||
                      a.forfeited ||
                      (a.type === 'grand' && !state.config.finalised)
                    }
                    onClick={async () => {
                      if (
                        await confirm(
                          `Confirm collection by ${account(a.accountId)?.fullName} (${account(a.accountId)?.email})? Check their signed-in account before handing over the prize.`,
                        )
                      )
                        command('host.collect', { id: a.id, identityConfirmed: true });
                    }}
                  >
                    {a.collected
                      ? 'Collected'
                      : a.forfeited
                        ? 'Closed unclaimed'
                        : 'Confirm collection'}
                  </Button>
                  {!a.collected && !a.forfeited && (
                    <Button
                      secondary
                      disabled={locked}
                      onClick={() =>
                        reason('Close unclaimed prize', 'host.forfeitAward', { id: a.id })
                      }
                    >
                      Close unclaimed
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Pages
              offset={awards}
              setOffset={setAwards}
              size={50}
              total={data.totals.awards}
              label="prizes"
            />
          </section>
        </>
      )}
      {data && tab === 'admin' && (
        <div className="space-y-6">
          <details>
            <summary className="cursor-pointer py-3 font-medium">Attendance summary</summary>
            <p className="text-xs text-[#62625C]">
              Called solo players and started Live participants. Groups under five are combined.
            </p>
            {Object.entries(data.attendanceSummary).map(([label, count]) => (
              <p key={label} className="flex justify-between py-2 text-sm">
                <span>{label}</span>
                <span>{count}</span>
              </p>
            ))}
          </details>
          <details>
            <summary className="cursor-pointer py-3 font-medium">
              Email delivery · {data.mail.length} pending
            </summary>
            {data.mail.map((m) => (
              <div key={m.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  {m.error || 'Queued'} · {m.tries} tries
                </span>
                {m.error && (
                  <Button
                    secondary
                    disabled={locked}
                    onClick={() => command('host.retryMail', { id: m.id })}
                  >
                    Retry
                  </Button>
                )}
              </div>
            ))}
          </details>
          <details>
            <summary className="cursor-pointer py-3 font-medium">Activity log</summary>
            {[...data.audit].reverse().map((e) => (
              <p key={e.id} className="border-b border-[#DDDDD5] py-3 text-sm">
                {when(e.at)} · {e.action} {e.detail?.reason}
              </p>
            ))}
          </details>
          <Button
            secondary
            disabled={locked}
            onClick={async () => {
              const r = await command('host.export');
              if (r?.csv) {
                const url = URL.createObjectURL(
                  new Blob([r.csv], { type: 'text/csv;charset=utf-8' }),
                );
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
          <details>
            <summary className="cursor-pointer py-3 font-medium">
              Delete event personal data
            </summary>
            <p className="mb-4 text-sm">
              After prize distribution and the configured cleanup date. This cannot be undone.
            </p>
            <Button
              danger
              disabled={locked}
              onClick={() =>
                reason('Delete personal data', 'host.purge', {
                  confirmation: 'DELETE PERSONAL DATA',
                })
              }
            >
              Delete personal data
            </Button>
          </details>
        </div>
      )}
      {dialog && <ReasonDialog execute={command} dialog={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
