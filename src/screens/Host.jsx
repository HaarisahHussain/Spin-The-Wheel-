import { useConfirmation } from '../components/useConfirmation';
import { useState, useEffect, useRef } from 'react';
import { useArcade } from '../state';
import { Wordmark, Notice, cx } from '../components/ui';
import { Login } from './host/Login';
import { Live } from './host/Live';
import { EventForm } from './host/EventForm';
import { Results } from './host/Results';
import { Updates } from './host/Updates';
export function Host() {
  const { state, command, connectionId, tabId, busy } = useArcade(),
    [tab, setTab] = useState('live'),
    [dirty, setDirty] = useState(false);
  const attempted = useRef(null);
  const [confirm, confirmation] = useConfirmation();
  useEffect(() => {
    if (!busy && state?.staff && connectionId && attempted.current !== connectionId) {
      attempted.current = connectionId;
      if (
        !state.staff.ownsControl &&
        (!state.staff.controlExpires ||
          state.staff.controlExpires <= state.now ||
          state.staff.leaseTab === tabId)
      )
        command('hostControl', { expectedEpoch: state.staff.epoch });
    }
  }, [connectionId, state?.staff?.id, busy]);
  return (
    <div className="mx-auto min-h-svh max-w-7xl px-8 py-7">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-5 border-b border-[#DDDDD5] pb-6">
        <Wordmark />
        {state?.staff && (
          <>
            <nav className="flex gap-6">
              {['live', 'event', 'results', 'updates'].map((t) => (
                <button
                  key={t}
                  onClick={async () => {
                    if (!dirty || (await confirm('Discard unsaved Event settings?'))) {
                      setDirty(false);
                      setTab(t);
                    }
                  }}
                  className={cx(
                    'min-h-11 capitalize',
                    tab === t ? 'font-medium' : 'text-[#62625C]',
                  )}
                >
                  {t === 'results' ? 'Players & Results' : t}
                </button>
              ))}
            </nav>
            <button
              className="text-sm text-[#62625C]"
              onClick={async () => {
                if (!dirty || (await confirm('Discard unsaved Event settings and sign out?')))
                  command('logout');
              }}
            >
              Sign out
            </button>
          </>
        )}
      </header>
      <Notice />
      {confirmation}
      {!state ? (
        <p>Connecting…</p>
      ) : !state.staff ? (
        <Login />
      ) : !state.staff.ownsControl ? (
        <div className="space-y-5">
          <h1 className="text-2xl font-medium">Host controls are open elsewhere.</h1>
          <p>Games and the queue will continue.</p>
          <button
            className="min-h-12 rounded-lg bg-[#252525] px-5 text-white"
            onClick={async () => {
              if (await confirm('Take control here? The other controller will lose access.'))
                command('hostControl', { expectedEpoch: state.staff.epoch, confirm: true });
            }}
          >
            Take control here
          </button>
        </div>
      ) : (
        <>
          <div className="mb-8 flex gap-5 text-sm text-[#62625C]">
            <a href="/display/join" target="_blank" rel="noreferrer" className="underline">
              Open Join Display
            </a>
            <a href="/display/play" target="_blank" rel="noreferrer" className="underline">
              Open Play Display
            </a>
          </div>
          {tab === 'live' ? (
            <Live onOpenSettings={() => setTab('event')} />
          ) : tab === 'event' ? (
            <EventForm onDirty={setDirty} />
          ) : tab === 'results' ? (
            <Results />
          ) : (
            <Updates />
          )}
        </>
      )}
    </div>
  );
}
