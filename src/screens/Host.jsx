import { useState } from 'react';
import { useArcade } from '../state';
import { Wordmark, Notice, Modal, cx } from '../components/ui';
import { Login } from './host/Login';
import { Live } from './host/Live';
import { EventForm } from './host/EventForm';
import { Results } from './host/Results';
import { Updates } from './host/Updates';
export function Host() {
  const { state, command, recovery, setRecovery, pairing, setPairing } = useArcade(),
    [tab, setTab] = useState('live');
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
                  onClick={() => setTab(t)}
                  className={cx(
                    'min-h-11 capitalize',
                    tab === t ? 'font-medium' : 'text-[#62625C]',
                  )}
                >
                  {t}
                </button>
              ))}
            </nav>
            <button className="text-sm text-[#62625C]" onClick={() => command('logout')}>
              Sign out
            </button>
          </>
        )}
      </header>
      <Notice />
      {!state ? (
        <p>Connecting…</p>
      ) : !state.staff ? (
        <Login />
      ) : (
        <>
          <div className="mb-8 flex gap-5 text-sm text-[#62625C]">
            <a href="/display/join" target="_blank" rel="noreferrer" className="underline">
              Open Join Display
            </a>
            <a href="/display/play" target="_blank" rel="noreferrer" className="underline">
              Open Play Display
            </a>
            <span>
              {state.staff.username} · {state.staff.role}
            </span>
          </div>
          {tab === 'live' ? (
            <Live />
          ) : tab === 'event' ? (
            <EventForm key={state.config.policyVersion} />
          ) : tab === 'results' ? (
            <Results />
          ) : (
            <Updates />
          )}
        </>
      )}
      {pairing && (
        <Modal title="Pair a spare controller" onClose={() => setPairing('')}>
          <p className="mb-4 text-sm text-[#62625C]">
            Open /controller on the spare device and enter this one-use code. Expires in five
            minutes.
          </p>
          <code className="text-xl">{pairing}</code>
        </Modal>
      )}
      {recovery && (
        <Modal title="Participant recovery code" onClose={() => setRecovery('')}>
          <p className="mb-4 text-sm text-[#62625C]">
            Give this only to the participant whose identity you checked.
          </p>
          <code className="break-all text-sm">{recovery}</code>
        </Modal>
      )}
    </div>
  );
}
