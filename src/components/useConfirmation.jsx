import { useState, useEffect, useRef } from 'react';
import { Button, Modal } from './ui';
export function useConfirmation() {
  const [message, setMessage] = useState(null),
    pending = useRef(null);
  const finish = (accepted) => {
    pending.current?.(accepted);
    pending.current = null;
    setMessage(null);
  };
  useEffect(() => () => pending.current?.(false), []);
  return [
    (text) =>
      new Promise((resolve) => {
        pending.current?.(false);
        pending.current = resolve;
        setMessage(text);
      }),
    message && (
      <Modal title="Please confirm" onClose={() => finish(false)}>
        <p className="mb-6 text-sm">{message}</p>
        <div className="flex justify-end gap-3">
          <Button secondary onClick={() => finish(false)}>
            Cancel
          </Button>
          <Button onClick={() => finish(true)}>Confirm</Button>
        </div>
      </Modal>
    ),
  ];
}
