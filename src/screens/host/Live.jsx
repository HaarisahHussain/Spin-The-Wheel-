import { useState } from 'react';
import { useArcade } from '../../state';
import { Button, Timer } from '../../components/ui';
import { gameById } from '../../../shared/catalog';
import { LiveStatus } from '../../components/LiveStatus';
import { ReasonDialog } from './ReasonDialog';
export function Live() {
  const { state, command, busy } = useArcade(),
    [dialog, setDialog] = useState(null);
  const a = state.active,
    c = state.host.config,
    live = state.live;
  function withReason(action, payload, title) {
    setDialog({ action, payload, title });
  }
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
      <section>
        <p className="mb-3 text-sm text-[#62625C]">Current session</p>
        <h1 className="text-4xl font-medium tracking-tight">
          {live
            ? live.phase === 'wheel'
              ? 'Selecting game…'
              : gameById(live.gameId)?.name || 'Live arcade'
            : a
              ? a.alias
              : 'Ready for the next turn.'}
        </h1>
        <p className="mt-4 text-[#62625C]">
          {live
            ? `Live · ${live.phase} · ${live.roster.length} joined`
            : a
              ? `${a.mode} · ${a.phase}`
              : 'Confirm the next player is present.'}
        </p>
        <div className="my-8 flex flex-wrap gap-3">
          {!a && !live ? (
            <Button
              disabled={busy || !state.host.queue.length || c.paused}
              onClick={() => command('host.call')}
            >
              Call next player
            </Button>
          ) : a?.phase === 'called' ? (
            <p className="rounded-lg bg-white p-4">
              Waiting for Ready on their phone · <Timer until={a.until} />
            </p>
          ) : a?.phase === 'playing' ? (
            <div className="text-4xl">
              <Timer until={a.until} />
            </div>
          ) : live ? (
            <div className="text-4xl">
              <Timer until={live.until} />
            </div>
          ) : null}
          <Button
            secondary
            disabled={busy}
            onClick={() =>
              command('host.settings', { revision: c.policyVersion, paused: !c.paused })
            }
          >
            {c.paused ? 'Resume admissions' : 'Pause admissions'}
          </Button>
        </div>
        <div className="space-y-5 border-t border-[#DDDDD5] pt-6">
          <div className="flex items-center justify-between">
            <span>Next live lobby</span>
            <LiveStatus />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              secondary
              disabled={busy || !!live || state.config.liveAdmissionOpen === false}
              onClick={() => command('host.openLive')}
            >
              {a ? 'Open after this turn' : 'Open live lobby'}
            </Button>
            <Button secondary disabled={busy || !!live} onClick={() => command('host.delayLive')}>
              Delay live · 60s
            </Button>
            {live && (
              <Button
                secondary
                onClick={() => withReason('host.cancelLive', {}, 'Cancel live game')}
              >
                Cancel lobby / game
              </Button>
            )}
          </div>
        </div>
        <div className="mt-8 space-y-3 text-sm">
          <p className="text-[#62625C]">
            Email verification{' '}
            <strong className="text-[#252525]">{c.requireVerification ? 'ON' : 'OFF'}</strong>
          </p>
          {a && (
            <button
              className="block min-h-11 text-[#A33030] underline"
              onClick={() =>
                withReason(
                  a.phase === 'playing' ? 'host.incident' : 'host.skip',
                  {},
                  a.phase === 'playing' ? 'Report a technical interruption' : 'Skip selected turn',
                )
              }
            >
              {a.phase === 'playing' ? 'Report a technical interruption' : 'Skip selected turn'}
            </button>
          )}
          {state.host.incidents.some((i) => !i.resolved) && (
            <p className="text-[#A33030]">An interrupted attempt needs review in Results.</p>
          )}
        </div>
      </section>
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-xl font-medium">Queue</h2>
          <span className="text-sm text-[#62625C]">{state.host.queue.length} waiting</span>
        </div>
        <div className="max-h-[65vh] overflow-y-auto">
          {state.host.queue.length ? (
            state.host.queue.map((q, i) => (
              <div
                key={q.accountId}
                className="flex items-center justify-between gap-4 border-b border-[#DDDDD5] py-4"
              >
                <div>
                  <span className="mr-3 text-[#62625C]">{i + 1}</span>
                  <span className="font-medium">{q.alias}</span>
                  <p className="mt-1 text-sm capitalize text-[#62625C]">
                    {q.mode}
                    {q.heldUntil ? ' · verification hold' : ''}
                  </p>
                </div>
                <button
                  className="min-h-11 text-sm underline"
                  onClick={() =>
                    withReason('host.skip', { accountId: q.accountId }, 'Remove from queue')
                  }
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="py-10 text-[#62625C]">No one is waiting.</p>
          )}
        </div>
      </section>
      {dialog && <ReasonDialog dialog={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
