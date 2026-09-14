import { useState } from 'react';
import { useDetails } from '../../useDetails';
import { useConfirmation } from '../../components/useConfirmation';
import { useSensitiveAction } from './useSensitiveAction';
import { useArcade } from '../../state';
import { Button, Field } from '../../components/ui';
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
      <p className="font-medium">{account.alias}</p>
      {account.fullName && <p className="text-xs text-[#62625C]">{account.fullName}</p>}
      <details className="text-xs text-[#62625C]">
        <summary>Account ID</summary>
        <p className="break-all">{account.id}</p>
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
  const { busy } = useArcade();
  const [tab, setTab] = useState('sessions'),
    [mode, setMode] = useState('all');
  const [query, setQuery] = useState(''),
    [people, setPeople] = useState(0),
    [attempts, setAttempts] = useState(0);
  const [dialog, setDialog] = useState(null);
  const { command, dialog: sensitiveDialog } = useSensitiveAction();
  const [confirm, confirmation] = useConfirmation();
  const resource = useDetails('results', { q: query, mode, people, attempts });
  const data = resource.data;
  const account = (id) => data?.accounts.find((a) => a.id === id);
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
          label="Find player"
          placeholder="Username, optional name or account ID"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPeople(0);
            setAttempts(0);
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
            {['all', 'solo', 'live'].map((m) => (
              <Button
                key={m}
                secondary={mode !== m}
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setAttempts(0);
                }}
              >
                {m === 'all' ? 'All sessions' : m === 'solo' ? 'Solo' : 'Live'}
              </Button>
            ))}
          </div>
          <p className="text-xs text-[#62625C]">UK time · Best solo or Live session counts.</p>
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
                          disabled={locked}
                          onClick={() =>
                            reason(
                              'Resolve interruption — keep earned points',
                              'host.resolveInterruption',
                              { attemptId: a.id },
                            )
                          }
                        >
                          Resolve interruption
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
                <Button
                  secondary
                  disabled={locked}
                  onClick={async () => {
                    if (await confirm(`Add ${a.alias} to the queue?`))
                      command('host.assistedEnqueue', { accountId: a.id, identityConfirmed: true });
                  }}
                >
                  Add to queue
                </Button>
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
      {data && tab === 'admin' && (
        <div className="space-y-6">
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
                a.download = 'arcade-results.csv';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }
            }}
          >
            Export results
          </Button>
          <details>
            <summary className="cursor-pointer py-3 font-medium">Delete event data</summary>
            <p className="mb-4 text-sm">
              After the configured cleanup date, with no active or queued games. This cannot be
              undone.
            </p>
            <Button
              danger
              disabled={locked}
              onClick={() =>
                reason('Delete event data', 'host.purge', {
                  confirmation: 'DELETE EVENT DATA',
                })
              }
            >
              Delete event data
            </Button>
          </details>
        </div>
      )}
      {dialog && <ReasonDialog execute={command} dialog={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
