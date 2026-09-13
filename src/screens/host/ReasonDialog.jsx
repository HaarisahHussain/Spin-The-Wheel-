import { useArcade } from '../../state';
import { Button, Textarea, Modal } from '../../components/ui';
export function ReasonDialog({ dialog, onClose, execute }) {
  const { command, busy } = useArcade();
  return (
    <Modal title={dialog.title} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await (execute || command)(dialog.action, {
            ...dialog.payload,
            reason: new FormData(e.currentTarget).get('reason'),
          });
          if (result) onClose();
        }}
      >
        <Textarea
          label="Reason / evidence"
          name="reason"
          minLength={dialog.minimum || 1}
          maxLength={500}
          required
        />
        <Button danger={dialog.action.includes('void')} disabled={busy} className="w-full">
          Confirm
        </Button>
      </form>
    </Modal>
  );
}
