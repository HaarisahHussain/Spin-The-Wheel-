import { useState } from 'react';
import { useArcade } from '../../state';
import { Button, Field, Textarea } from '../../components/ui';
export function Updates() {
  const { state, command, busy } = useArcade(),
    [editing, setEditing] = useState(null),
    [title, setTitle] = useState(''),
    [body, setBody] = useState(''),
    [preview, setPreview] = useState(false);
  return (
    <div className="max-w-3xl">
      <h1 className="mb-8 text-3xl font-medium">Updates</h1>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await command('host.update', { id: editing, title, body })) {
            setTitle('');
            setBody('');
            setEditing(null);
            setPreview(false);
          }
        }}
      >
        <Field
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
        />
        <Textarea
          label="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1500}
          required
        />
        <div className="flex gap-3">
          <Button disabled={busy}>{editing ? 'Save edit' : 'Publish'}</Button>
          <Button secondary type="button" onClick={() => setPreview(!preview)}>
            Preview
          </Button>
        </div>
        {preview && (
          <article className="rounded-xl bg-white p-6">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-[#62625C]">{body}</p>
          </article>
        )}
      </form>
      <div className="mt-10">
        {[...state.host.updates]
          .reverse()
          .filter((u) => !u.archived)
          .map((u) => (
            <article key={u.id} className="border-t border-[#DDDDD5] py-6">
              <div className="flex justify-between gap-4">
                <h2 className="font-medium">{u.title}</h2>
                <span className="text-xs text-[#62625C]">{new Date(u.at).toLocaleString()}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[#62625C]">{u.body}</p>
              <div className="mt-4 flex gap-5 text-sm">
                <button
                  className="underline"
                  onClick={() => {
                    setEditing(u.id);
                    setTitle(u.title);
                    setBody(u.body);
                  }}
                >
                  Edit
                </button>
                <button
                  className="underline"
                  onClick={() => command('host.archiveUpdate', { id: u.id })}
                >
                  Archive
                </button>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
