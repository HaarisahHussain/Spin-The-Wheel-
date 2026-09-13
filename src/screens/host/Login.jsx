import { useState } from 'react';
import { useArcade } from '../../state';
import { Button, Field } from '../../components/ui';
export function Login() {
  const { command, busy, connected } = useArcade(),
    [takeover, setTakeover] = useState(null);
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-8 text-3xl font-medium">Host sign in</h1>
      {takeover ? (
        <div className="space-y-5">
          <p>Host controls are open elsewhere.</p>
          <p className="text-sm text-[#62625C]">
            Taking over signs out the other session. Games and the queue will continue.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              const r = await command('hostTakeover', { challenge: takeover });
              if (!r) setTakeover(null);
            }}
          >
            Take over
          </Button>
          <Button secondary onClick={() => setTakeover(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await command(
              'staffLogin',
              Object.fromEntries(new FormData(e.currentTarget)),
            );
            if (r?.takeover) setTakeover(r.takeover);
          }}
        >
          <Field
            label="Username"
            name="username"
            defaultValue="host"
            autoComplete="username"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Button className="w-full" disabled={busy || !connected}>
            Sign in
          </Button>
        </form>
      )}
    </div>
  );
}
