import { useState } from 'react';
import { useArcade } from '../../state';
import { Modal, Field, Button } from '../../components/ui';
export function useSensitiveAction() {
  const { state, command: send, busy, setError } = useArcade(),
    [pending, setPending] = useState(null),
    [password, setPassword] = useState('');
  const command = async (action, payload = {}) => {
    const protectedAction = ['host.export', 'host.purge'].includes(action);
    const requestPassword = () =>
      new Promise((resolve) => setPending({ action, payload, resolve, epoch: state.staff.epoch }));
    if (protectedAction && state.now - state.staff.reauthenticated >= 900000)
      return requestPassword();
    try {
      return await send(action, payload, { throwOnError: protectedAction });
    } catch (error) {
      if (error.code === 'REAUTHENTICATE') return requestPassword();
      setError(error.message);
      return null;
    }
  };
  const close = () => {
    pending?.resolve(null);
    setPending(null);
    setPassword('');
  };
  const dialog = pending ? (
    <Modal title="Confirm host password" onClose={close}>
      <p className="mb-4 text-sm">Confirm your password to continue this action.</p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await send('hostReauthenticate', { password });
          if (!ok) return;
          const task = pending;
          setPending(null);
          setPassword('');
          if (task.epoch !== state.staff.epoch) {
            task.resolve(null);
            return;
          }
          task.resolve(await send(task.action, task.payload));
        }}
      >
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button disabled={busy}>Continue</Button>
      </form>
    </Modal>
  ) : null;
  return { command, dialog };
}
