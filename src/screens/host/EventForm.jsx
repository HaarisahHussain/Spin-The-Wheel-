import { useState } from 'react';
import { useArcade } from '../../state';
import { Button, Field, Select, cx } from '../../components/ui';
const dateInput = (value) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function EventForm() {
  const { state, command, busy } = useArcade(),
    c = state.host.config;
  const [windows, setWindows] = useState(c.windows),
    [rankedEnabled, setRankedEnabled] = useState(c.rankedEnabled && !c.finalised),
    [requireVerification, setRequireVerification] = useState(c.requireVerification),
    [autoLive, setAutoLive] = useState(c.autoLive);
  return (
    <div className="max-w-4xl">
      <h1 className="mb-8 text-3xl font-medium">Event settings</h1>
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          command('host.settings', {
            revision: c.policyVersion,
            windows,
            requireVerification,
            rankedEnabled,
            autoLive,
            idlePresentation: data.idlePresentation,
            animateIdleWheel: data.animateIdleWheel === 'on',
            ...Object.fromEntries(
              ['interval', 'lobbySeconds', 'liveTimeScale', 'capacity', 'instantPrizes'].map(
                (k) => [k, Number(data[k])],
              ),
            ),
            playoffAt: data.playoffAt,
            playoffLocation: data.playoffLocation,
            replyDeadline: data.replyDeadline,
          });
        }}
      >
        <section className="space-y-5 border-b border-[#DDDDD5] pb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium">Require email verification</h2>
              <p className="mt-2 text-sm text-[#62625C]">Both BCU domains. Every game mode.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Require email verification"
              aria-checked={requireVerification}
              disabled={busy}
              onClick={() => setRequireVerification(!requireVerification)}
              className={cx(
                'relative h-8 w-14 rounded-full transition-colors',
                requireVerification ? 'bg-[#365E53]' : 'bg-[#B6B6AD]',
              )}
            >
              <span
                className={cx(
                  'absolute top-1 size-6 rounded-full bg-white transition-transform',
                  requireVerification ? 'left-1 translate-x-6' : 'left-1',
                )}
              />
            </button>
          </div>
          {!requireVerification && (
            <p className="text-sm text-[#A33030]">
              OFF: mailbox ownership is not checked. False or duplicate addresses are easier to use.
            </p>
          )}
        </section>
        <section className="space-y-3 border-b border-[#DDDDD5] pb-8">
          <h2 className="text-xl font-medium">Ranked play</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              role="switch"
              aria-label="Ranked play"
              checked={rankedEnabled}
              disabled={busy || c.finalised}
              onChange={(e) => setRankedEnabled(e.target.checked)}
              className="size-5 accent-[#365E53]"
            />
            {rankedEnabled ? 'On' : 'Off'}
          </label>
          <p className="text-sm text-[#62625C]">
            {c.finalised
              ? 'Results are final. Reopen results to enable Ranked.'
              : 'Save to apply. Opening hours and Pause admissions still apply. Already admitted turns can finish.'}
          </p>
          <p className="text-sm text-[#62625C]">
            Three starts per account. Switching off and on does not reset attempts or scores.
          </p>
        </section>
        <section>
          <div className="mb-5 flex justify-between">
            <h2 className="text-xl font-medium">Opening windows</h2>
            <button
              type="button"
              className="text-sm underline"
              onClick={() =>
                setWindows([
                  ...windows,
                  {
                    start: Date.now(),
                    cutoff: Date.now() + 5 * 3600000,
                    end: Date.now() + 6 * 3600000,
                  },
                ])
              }
            >
              Add day
            </button>
          </div>
          <p className="mb-4 text-sm text-[#62625C]">
            Times use this laptop’s timezone. Venue schedule: Europe/London.
          </p>
          <div className="space-y-5">
            {windows.map((w, i) => (
              <div
                key={i}
                className="grid items-end gap-3 rounded-xl border border-[#DDDDD5] p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                {[
                  ['start', 'Open'],
                  ['cutoff', 'Stop admissions'],
                  ['end', 'Close'],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    type="datetime-local"
                    value={dateInput(w[key])}
                    onChange={(e) =>
                      setWindows(
                        windows.map((row, n) =>
                          n === i ? { ...row, [key]: new Date(e.target.value).getTime() } : row,
                        ),
                      )
                    }
                    required
                  />
                ))}
                <Button
                  secondary
                  type="button"
                  onClick={() => setWindows(windows.filter((_, n) => n !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-5">
          <div className="flex justify-between">
            <h2 className="text-xl font-medium">Multiplayer</h2>
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={autoLive}
                onChange={(e) => setAutoLive(e.target.checked)}
                className="size-5 accent-[#365E53]"
              />
              Automatic
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Time between live games (seconds)"
              name="interval"
              type="number"
              min="180"
              max="900"
              defaultValue={c.interval}
            />
            <Field
              label="Lobby (seconds)"
              name="lobbySeconds"
              type="number"
              min="15"
              max="45"
              defaultValue={c.lobbySeconds}
            />
            <Field
              label="Question time multiplier"
              name="liveTimeScale"
              type="number"
              min="0.75"
              max="1.5"
              step="0.25"
              defaultValue={c.liveTimeScale}
            />
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-medium">Ready to Play display</h2>
          <Select
            label="Show while waiting"
            name="idlePresentation"
            defaultValue={c.idlePresentation}
          >
            <option value="text">Text only</option>
            <option value="wheel">Wheel only</option>
            <option value="both">Both</option>
          </Select>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="animateIdleWheel"
              defaultChecked={c.animateIdleWheel}
              className="size-5 accent-[#365E53]"
            />
            Keep idle wheel spinning
          </label>
          <p className="text-sm text-[#62625C]">
            Changes apply when saved. Live timings apply to the next session.
          </p>
          <p className="text-sm text-[#62625C]">
            Next scheduled lobby: {c.autoLive ? new Date(c.nextLobbyAt).toLocaleString() : 'Manual'}
          </p>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Queue capacity"
            name="capacity"
            type="number"
            min="1"
            max="100"
            defaultValue={c.capacity}
          />
          <Field
            label="Instant prizes remaining"
            name="instantPrizes"
            type="number"
            min="0"
            max="500"
            defaultValue={c.instantPrizes}
          />
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-medium">Tied prize winners</h2>
          <Field
            label="Playoff date and time (published text)"
            name="playoffAt"
            defaultValue={c.playoffAt}
            placeholder="Thursday 24 September, 15:30 BST"
          />
          <Field label="Location" name="playoffLocation" defaultValue={c.playoffLocation} />
          <Field
            label="Reply deadline (at least 24 hours after notification)"
            name="replyDeadline"
            defaultValue={c.replyDeadline}
          />
        </section>
        <Button disabled={busy}>Save settings</Button>
      </form>
    </div>
  );
}
