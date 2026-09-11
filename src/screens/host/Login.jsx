import { useArcade } from '../../state';
import { Button, Field } from '../../components/ui';
export function Login() {
  const { command, busy } = useArcade();
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-8 text-3xl font-medium">Host sign in</h1>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          command('staffLogin', Object.fromEntries(new FormData(e.currentTarget)));
        }}
      >
        <Field label="Username" name="username" autoComplete="username" required />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="Authenticator code"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
        <Button disabled={busy} className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
