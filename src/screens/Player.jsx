import { useState } from 'react';
import { useArcade } from '../state';
import {
  Button,
  Field,
  Select,
  Wordmark,
  Notice,
  Empty,
  Score,
  Timer,
  Leaderboard,
  Modal,
  cx,
} from '../components/ui';
import { Game, Question } from '../games/Game';
import { Wheel } from '../components/Wheel';
import { gameById, scoreText } from '../../shared/catalog';

function ControllerPair() {
  const { command, busy } = useArcade();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        command('claimController', { code: new FormData(e.currentTarget).get('code') });
      }}
    >
      <h1 className="text-3xl font-medium">Spare controller</h1>
      <Field label="Pairing code from the host" name="code" autoComplete="off" required />
      <Button className="w-full" disabled={busy}>
        Connect controller
      </Button>
    </form>
  );
}
function Registration() {
  const { command, busy } = useArcade(),
    [recover, setRecover] = useState(false);
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-sm text-[#62625C]">Welcome to the Arcade</p>
        <h1 className="text-3xl font-medium leading-tight tracking-tight">Join the Arcade.</h1>
      </div>
      {recover ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            command('recover', { code: new FormData(e.currentTarget).get('code') });
          }}
        >
          <Field label="Recovery code" name="code" required />
          <Button className="w-full" disabled={busy}>
            Sign in
          </Button>
          <button type="button" onClick={() => setRecover(false)} className="text-sm underline">
            Use email instead
          </button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            command('register', { ...data, consent: data.consent === 'on' });
          }}
        >
          <Field
            label="BCU email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@mail.bcu.ac.uk"
            required
          />
          <Field
            label="Course"
            name="course"
            placeholder="e.g. Computer Science"
            maxLength={120}
            required
          />
          <Select label="Academic level" name="level" required>
            <option value="">Choose level</option>
            {[
              'Foundation',
              'Year 1',
              'Year 2',
              'Placement',
              'Final year',
              'Postgraduate',
              'Staff / not applicable',
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Select>
          <label className="flex items-start gap-3 pt-2 text-sm text-[#62625C]">
            <input type="checkbox" name="consent" className="mt-1 size-4 accent-[#365E53]" />
            <span>Send me one email about BCUSCA membership.</span>
          </label>
          <p className="text-xs leading-relaxed text-[#62625C]">
            We use your details to run the Arcade and contact prize winners. Course and level appear
            only in grouped attendance reports. Personal details are deleted after prizes and the
            correction period.
          </p>
          <Button className="w-full" disabled={busy}>
            Continue
          </Button>
          <button
            type="button"
            onClick={() => setRecover(true)}
            className="w-full py-2 text-sm underline"
          >
            I have a recovery code
          </button>
        </form>
      )}
    </div>
  );
}
function Verification() {
  const { state, command, busy } = useArcade(),
    [sent, setSent] = useState(false),
    [preview, setPreview] = useState(null),
    [editing, setEditing] = useState(false);
  const linkToken = new URLSearchParams(location.search).get('token');
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-medium tracking-tight">Verify your email</h1>
      <p className="break-all text-[#62625C]">{state.me.email}</p>
      {linkToken && (
        <Button
          className="w-full"
          disabled={busy}
          onClick={async () => {
            const r = await command('verify', { linkToken });
            if (r) history.replaceState(null, '', '/');
          }}
        >
          Confirm this browser
        </Button>
      )}
      {!sent ? (
        <Button
          className="w-full"
          disabled={busy}
          onClick={async () => {
            if (await command('sendVerification')) setSent(true);
          }}
        >
          Send verification email
        </Button>
      ) : (
        <p role="status" className="text-sm text-[#365E53]">
          Email queued. Check your inbox or junk folder.
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          command('verify', { code: new FormData(e.currentTarget).get('code') });
        }}
      >
        <Field
          label="Six-digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
        <Button className="w-full" disabled={busy}>
          Verify
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <button
          disabled={busy}
          onClick={() => command('sendVerification')}
          className="min-h-11 underline"
        >
          Resend email
        </button>
        {!state.me.pending && (
          <button onClick={() => setEditing(!editing)} className="min-h-11 underline">
            Change email
          </button>
        )}
      </div>
      {editing && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            command('changeEmail', { email: new FormData(e.currentTarget).get('email') });
          }}
        >
          <Field label="Correct BCU email" type="email" name="email" required />
          <Button secondary disabled={busy}>
            Save email
          </Button>
        </form>
      )}
      {state.development && (
        <div className="border-t border-[#DDDDD5] pt-4 text-sm">
          <button
            className="underline"
            onClick={async () => setPreview(await (await fetch('/api/development-mail')).json())}
          >
            Development email preview
          </button>
          {preview && (
            <p className="mt-2 font-mono">{preview.code || 'Waiting for the local mail worker…'}</p>
          )}
        </div>
      )}
    </div>
  );
}
function LiveInvitation() {
  const { state, command, busy } = useArcade();
  return state.live?.phase === 'lobby' ? (
    <form
      className="mt-6 space-y-3 border-t border-[#DDDDD5] pt-6"
      onSubmit={(e) => {
        e.preventDefault();
        command('joinLive', { code: new FormData(e.currentTarget).get('code') });
      }}
    >
      <div className="flex justify-between">
        <h2 className="font-medium">Join Live</h2>
        <Timer until={state.live.until} />
      </div>
      <Field
        label="Lobby code"
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
      />
      <Button secondary className="w-full" disabled={busy}>
        Join Live Game
      </Button>
    </form>
  ) : null;
}
function LiveController() {
  const { state, command } = useArcade(),
    live = state.live;
  if (live.phase === 'wheel') return <Wheel key={live.selection.id} selection={live.selection} />;
  if (['lobby', 'countdown'].includes(live.phase))
    return (
      <div className="space-y-8 py-8">
        <p className="text-[#62625C]">{gameById(live.gameId)?.name || 'Live arcade'}</p>
        <h1 className="text-3xl font-medium">You’re in.</h1>
        <Timer large until={live.until} />
        <p className="text-sm text-[#62625C]">Your solo queue position is saved.</p>
      </div>
    );
  if (live.phase === 'cancelled') return <Empty title="Live game cancelled">{live.message}</Empty>;
  if (live.phase === 'winner') {
    const own = live.roster.find((e) => e.accountId === state.me.id);
    return (
      <div className="space-y-6 py-8">
        <h1 className="text-3xl font-medium">
          {live.winners?.includes(state.me.id) ? 'You won.' : 'Well played.'}
        </h1>
        <Score value={own?.score} />
        <p className="text-[#62625C]">Solo play resumes shortly.</p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-between text-sm text-[#62625C]">
        <span>Live · {live.level + 1} / 6</span>
        <Timer until={live.until} />
      </div>
      <Question
        key={live.question.id}
        question={live.question}
        gameId={live.gameId}
        locked={state.me.liveEntry.submitted || live.phase === 'reveal'}
        reveal={live.phase === 'reveal'}
        submitted={
          state.me.liveEntry.submitted
            ? state.me.liveEntry.answer
            : live.phase === 'reveal'
              ? null
              : undefined
        }
        timedOut={!state.me.liveEntry.submitted}
        onSubmit={(answer) => command('liveAnswer', { answer, challengeId: live.question.id })}
      />
    </div>
  );
}
function PlayHome() {
  const { state, command, busy } = useArcade(),
    [mode, setMode] = useState('practice');
  const me = state.me,
    a = state.active;
  if (state.live && me.liveEntry) return <LiveController />;
  if (a?.accountId === me.id) {
    if (a.phase === 'called')
      return (
        <div className="space-y-7 py-8">
          <p className="text-[#62625C]">{me.alias}</p>
          <h1 className="text-4xl font-medium tracking-tight">Your turn.</h1>
          <p className="text-[#62625C]">Ready at the stall?</p>
          <Button className="w-full" disabled={busy} onClick={() => command('ready')}>
            I’m ready
          </Button>
          <Timer until={a.until} />
        </div>
      );
    if (a.phase === 'wheel')
      return (
        <div className="space-y-8">
          <h1 className="text-2xl font-medium">Let’s pick your game.</h1>
          <Wheel key={a.selection.id} selection={a.selection} />
        </div>
      );
    if (a.phase === 'briefing')
      return (
        <div className="space-y-8 py-12">
          <h1 className="text-3xl font-medium">{gameById(a.gameId).name}</h1>
          <p className="text-lg text-[#62625C]">{gameById(a.gameId).description}</p>
          <p className="text-sm text-[#62625C]">
            {a.gameId === 'robot'
              ? 'Arrows move in the direction shown. Run your program; Stop to change it.'
              : 'Choose carefully. Each question accepts one answer.'}
          </p>
        </div>
      );
    if (a.phase === 'countdown')
      return (
        <div className="space-y-6 py-16 text-center">
          <h1 className="text-3xl font-medium">{gameById(a.gameId)?.name}</h1>
          <Timer large until={a.until} />
        </div>
      );
    if (a.phase === 'playing')
      return (
        <>
          <Game active={a} />
          <button
            className="mt-6 py-3 text-sm text-[#62625C] underline"
            onClick={() => {
              if (confirm('End this attempt? A ranked attempt will remain used.'))
                command('quit', { attemptId: a.attemptId });
            }}
          >
            End attempt
          </button>
        </>
      );
    if (a.phase === 'result')
      return (
        <div className="space-y-8 py-10">
          <h1 className="text-3xl font-medium">Your result.</h1>
          <Score value={a.game.score} />
          <p className="text-[#62625C]">
            {a.mode === 'ranked'
              ? `${3 - me.used} ranked attempts remaining`
              : 'Practice · not ranked'}
          </p>
          <p className="text-sm text-[#62625C]">
            Your result is saved. The next turn starts shortly.
          </p>
        </div>
      );
  }
  if (me.queue)
    return (
      <div className="space-y-6">
        <p className="text-[#62625C]">{me.alias}</p>
        <h1 className="text-3xl font-medium">You’re in the queue.</h1>
        <div className="py-5 text-8xl font-medium tracking-tight tabular-nums">
          {me.queue.position}
          <span className="ml-4 text-base font-normal tracking-normal text-[#62625C]">in line</span>
        </div>
        <p className="text-sm text-[#62625C]">
          {me.queue.heldUntil
            ? 'Verify your email to keep your place.'
            : `About ${Math.max(1, Math.ceil(me.queue.position * 1.5))} minutes · ${me.queue.mode}`}
        </p>
        <Button secondary onClick={() => command('leave')} disabled={busy}>
          Leave queue
        </Button>
        <LiveInvitation />
      </div>
    );
  const latest = me.attempts.at(-1),
    now = state.now,
    window = state.config.windows.find((w) => now >= w.start && now < w.cutoff),
    admissions = window && !state.config.paused && !state.config.finalised;
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-sm text-[#62625C]">{me.alias}</p>
        <h1 className="text-3xl font-medium tracking-tight">Ready to play?</h1>
      </div>
      {latest && (
        <div className="flex items-baseline justify-between border-b border-[#DDDDD5] pb-5">
          <span className="text-sm text-[#62625C]">
            Last result · {latest.status.replace('_', ' ')}
          </span>
          <span className="text-2xl font-medium tabular-nums">{scoreText(latest.score)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {['practice', 'ranked'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cx(
              'rounded-xl border p-5 text-left',
              mode === m ? 'border-[#365E53] bg-[#E9EDE6]' : 'border-[#C5C5BC] bg-white',
            )}
          >
            <span className="block font-medium capitalize">{m}</span>
            <span className="mt-2 block text-xs text-[#62625C]">
              {m === 'practice' ? 'Play for the challenge' : `${3 - me.used} attempts left`}
            </span>
          </button>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={
          busy ||
          !admissions ||
          (mode === 'ranked' && (!state.config.rankedEnabled || me.used >= 3))
        }
        onClick={() => command('enqueue', { mode })}
      >
        Enqueue
      </Button>
      {!admissions && <p className="text-sm text-[#62625C]">Admissions are currently closed.</p>}
      {mode === 'ranked' && !state.config.rankedEnabled && (
        <p className="text-sm text-[#62625C]">Ranked is not open yet.</p>
      )}
      {state.config.autoLive && (
        <div className="flex justify-between text-sm text-[#62625C]">
          <span>Next multiplayer lobby</span>
          <Timer until={state.config.nextLobbyAt} />
        </div>
      )}
      <LiveInvitation />
    </div>
  );
}
export function Player() {
  const { state, command, recovery, setRecovery } = useArcade(),
    [tab, setTab] = useState('play'),
    [settings, setSettings] = useState(false),
    [page, setPage] = useState(0);
  const me = state?.me,
    focused =
      (state?.active?.accountId === me?.id &&
        ['playing', 'wheel', 'briefing', 'countdown'].includes(state?.active?.phase)) ||
      !!me?.liveEntry;
  const alreadyStarted =
    (state?.active?.accountId === me?.id && ['playing', 'result'].includes(state?.active?.phase)) ||
    (me?.liveEntry && ['question', 'reveal', 'winner'].includes(state?.live?.phase));
  const mustVerify =
    me &&
    !alreadyStarted &&
    (me.pending ||
      (!me.verified && (state.config.requireVerification || location.pathname === '/verify')));
  const [lastRead, setLastRead] = useState(() =>
    Number(localStorage.getItem('arcade-updates-read') || 0),
  );
  const unread = state?.updates.some((u) => u.at > lastRead);
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col px-5 pb-8 pt-7 sm:px-8">
      <header className="mb-10 flex items-center justify-between">
        <Wordmark />
        {me && !me.pending && !me.controller && (
          <button onClick={() => setSettings(true)} className="min-h-11 text-sm text-[#62625C]">
            Account
          </button>
        )}
      </header>
      <Notice />
      {!state ? (
        <p className="py-16 text-[#62625C]">Connecting…</p>
      ) : (
        <main className="flex-1">
          {!me ? (
            location.pathname === '/controller' ? (
              <ControllerPair />
            ) : (
              <Registration />
            )
          ) : mustVerify ? (
            me.controller ? (
              <Empty title="Verification required">
                Verify on your own device or speak to the host.
              </Empty>
            ) : (
              <Verification />
            )
          ) : tab === 'play' || focused || state.active?.accountId === me.id ? (
            <PlayHome />
          ) : tab === 'leaderboard' ? (
            <div className="space-y-6">
              <h1 className="text-3xl font-medium">Ranked standings</h1>
              <Leaderboard
                rows={state.leaderboard.slice(page * 15, (page + 1) * 15)}
                ownId={me.id}
              />
              <div className="flex justify-between">
                <Button secondary disabled={!page} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button
                  secondary
                  disabled={(page + 1) * 15 >= state.leaderboard.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
              {state.leaderboard.find((r) => r.accountId === me.id) && (
                <p className="text-sm text-[#62625C]">
                  Your rank: {state.leaderboard.find((r) => r.accountId === me.id).rank}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h1 className="mb-8 text-3xl font-medium">Updates</h1>
              {!state.updates.length ? (
                <Empty title="Nothing new yet." />
              ) : (
                [...state.updates].reverse().map((u) => (
                  <article key={u.id} className="border-b border-[#DDDDD5] py-6">
                    <p className="mb-2 text-xs text-[#62625C]">
                      {new Date(u.at).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <h2 className="font-medium">{u.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#62625C]">
                      {u.body}
                    </p>
                  </article>
                ))
              )}
            </div>
          )}
        </main>
      )}
      {me && !me.controller && !mustVerify && !focused && (
        <nav
          aria-label="Main navigation"
          className="sticky bottom-0 mt-10 flex justify-between border-t border-[#DDDDD5] bg-[#F7F7F2] py-4"
        >
          {['play', 'leaderboard', 'updates'].map((item) => (
            <button
              key={item}
              onClick={() => {
                setTab(item);
                if (item === 'updates') {
                  setLastRead(Date.now());
                  localStorage.setItem('arcade-updates-read', String(Date.now()));
                }
              }}
              className={cx(
                'min-h-11 px-2 text-sm capitalize',
                tab === item ? 'font-medium text-[#252525]' : 'text-[#62625C]',
              )}
            >
              {item}
              {item === 'updates' && unread && (
                <span className="ml-1 text-[#365E53]" aria-label="Unread">
                  •
                </span>
              )}
            </button>
          ))}
        </nav>
      )}
      {recovery && (
        <Modal title="Save your recovery code" onClose={() => setRecovery('')}>
          <p className="mb-4 text-sm text-[#62625C]">
            Use this private code to sign in again. It is shown only now.
          </p>
          <code className="block break-all rounded-lg bg-white p-4 text-sm">{recovery}</code>
          <Button className="mt-5 w-full" onClick={() => setRecovery('')}>
            I’ve saved it
          </Button>
        </Modal>
      )}
      {settings && (
        <Modal title="Your account" onClose={() => setSettings(false)}>
          <p className="break-all text-sm">{me.email}</p>
          <p className="mt-2 text-sm text-[#62625C]">
            {me.verified ? 'Email verified' : 'Email not verified'}
          </p>
          {!me.verified && (
            <Button
              secondary
              className="mt-5 w-full"
              onClick={() => {
                setSettings(false);
                location.href = '/verify';
              }}
            >
              Verify email
            </Button>
          )}
          <Button
            secondary
            className="mt-5 w-full"
            onClick={() => {
              command('logout');
              setSettings(false);
            }}
          >
            Sign out
          </Button>
          <div className="mt-6 space-y-3">
            {me.awards?.map((a) => (
              <p key={a.id} className="text-sm">
                {a.type === 'grand' ? 'Grand prize' : 'Live prize'} ·{' '}
                {a.collected ? 'Collected' : `Show the host: ${a.id.slice(0, 8)}`}
              </p>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
