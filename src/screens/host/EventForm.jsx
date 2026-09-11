import { useState } from 'react';
import { useArcade } from '../../state';
import { Button, Field, cx } from '../../components/ui';
import { ReasonDialog } from './ReasonDialog';
const dateInput = (value) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function EventForm() {
  const { state, command, busy } = useArcade(),
    c = state.host.config;
  const [windows, setWindows] = useState(c.windows),
    [calibrating, setCalibrating] = useState(false);
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
            ...Object.fromEntries(
              ['interval', 'lobbySeconds', 'liveSeconds', 'capacity', 'instantPrizes'].map((k) => [
                k,
                Number(data[k]),
              ]),
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
              aria-checked={c.requireVerification}
              disabled={busy}
              onClick={() =>
                command('host.settings', {
                  revision: c.policyVersion,
                  requireVerification: !c.requireVerification,
                })
              }
              className={cx(
                'relative h-8 w-14 rounded-full transition-colors',
                c.requireVerification ? 'bg-[#365E53]' : 'bg-[#B6B6AD]',
              )}
            >
              <span
                className={cx(
                  'absolute top-1 size-6 rounded-full bg-white transition-transform',
                  c.requireVerification ? 'left-1 translate-x-6' : 'left-1',
                )}
              />
            </button>
          </div>
          {!c.requireVerification && (
            <p className="text-sm text-[#A33030]">
              OFF: mailbox ownership is not checked. False or duplicate addresses are easier to use.
            </p>
          )}
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
                checked={c.autoLive}
                onChange={(e) =>
                  command('host.settings', {
                    revision: c.policyVersion,
                    autoLive: e.target.checked,
                  })
                }
                className="size-5 accent-[#365E53]"
              />
              Automatic
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Interval (seconds)"
              name="interval"
              type="number"
              min="60"
              max="3600"
              defaultValue={c.interval}
            />
            <Field
              label="Lobby (seconds)"
              name="lobbySeconds"
              type="number"
              min="10"
              max="120"
              defaultValue={c.lobbySeconds}
            />
            <Field
              label="Question (seconds)"
              name="liveSeconds"
              type="number"
              min="8"
              max="30"
              defaultValue={c.liveSeconds}
            />
          </div>
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
          <h2 className="text-xl font-medium">Prize-boundary playoffs</h2>
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
      <section className="mt-10 border-t border-[#DDDDD5] pt-6">
        <h2 className="text-xl font-medium">Ranked scoring</h2>
        <p className="my-4 text-sm text-[#62625C]">
          {c.rankedEnabled
            ? 'Enabled · calibration evidence recorded.'
            : 'Closed until representative cross-game playtests are complete.'}
        </p>
        <Button secondary disabled={busy || c.rankedEnabled} onClick={() => setCalibrating(true)}>
          Record calibration and open Ranked
        </Button>
      </section>
      {calibrating && (
        <ReasonDialog
          dialog={{
            title: 'Calibration evidence',
            action: 'host.calibrate',
            payload: {},
            minimum: 20,
          }}
          onClose={() => setCalibrating(false)}
        />
      )}
    </div>
  );
}
