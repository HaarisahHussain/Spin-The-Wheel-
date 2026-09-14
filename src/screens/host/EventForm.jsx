import { useState, useEffect } from 'react';
import { useArcade } from '../../state';
import { Button, Field, Select } from '../../components/ui';
const dateInput = (value) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function EventForm({ onDirty = () => {} }) {
  const { state, command, busy } = useArcade(),
    c = state.host.config;
  const [windows, setWindows] = useState(c.windows),
    [autoLive, setAutoLive] = useState(c.autoLive);
  const [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false),
    [revision, setRevision] = useState(c.policyVersion);
  useEffect(() => {
    onDirty(dirty);
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return (
    <div className="max-w-4xl">
      <h1 className="mb-8 text-3xl font-medium">Event settings</h1>
      {c.policyVersion !== revision && (
        <p role="alert" className="mb-4 text-sm">
          Settings changed elsewhere. Reopen this tab before editing again.
        </p>
      )}
      <form
        className="space-y-8"
        onChange={() => {
          setDirty(true);
          setSaved(false);
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          const result = await command('host.settings', {
            revision,
            windows,
            autoLive,
            idlePresentation: data.idlePresentation,
            animateIdleWheel: data.animateIdleWheel === 'on',
            ...Object.fromEntries(
              ['interval', 'lobbySeconds', 'liveTimeScale', 'capacity'].map((k) => [
                k,
                Number(data[k]),
              ]),
            ),
            cleanupAt: data.cleanupAt,
          });
          if (result) {
            setRevision(result.state?.host?.config?.policyVersion ?? revision + 1);
            setDirty(false);
            setSaved(true);
            onDirty(false);
          }
        }}
      >
        <section>
          <div className="mb-5 flex justify-between">
            <h2 className="text-xl font-medium">Opening windows</h2>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setDirty(true);
                setSaved(false);
                setWindows([
                  ...windows,
                  {
                    start: Date.now(),
                    cutoff: Date.now() + 5 * 3600000,
                    end: Date.now() + 6 * 3600000,
                  },
                ]);
              }}
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
                  onClick={() => {
                    setWindows(windows.filter((_, n) => n !== i));
                    setDirty(true);
                    setSaved(false);
                  }}
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
            label="Personal data cleanup date"
            name="cleanupAt"
            type="date"
            defaultValue={c.cleanupAt}
          />
        </section>
        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-[#DDDDD5] bg-[#F7F7F2] py-4">
          <span role="status" className="text-sm">
            {dirty ? 'Unsaved changes' : saved ? 'Settings saved' : 'Changes apply when saved'}
          </span>
          <Button disabled={busy}>Save settings</Button>
        </div>
      </form>
    </div>
  );
}
