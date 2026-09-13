import { useConfirmation } from '../components/useConfirmation';
import { Tutorial, GameHelp } from '../games/Tutorial';
import { useEffect, useState, useRef } from 'react';
import { useArcade, useClock } from '../state';
import { Wordmark, Notice, Button, Field, Select, Timer, Score, cx } from '../components/ui';
import { Wheel } from '../components/Wheel';
import { Game, Question } from '../games/Game';
import { PuzzleEditor, PuzzleReveal, PuzzleExecution, markerClass } from '../games/Puzzles';
import { gameById, availableGames, scoreText, grade, SCORING_VERSION } from '../../shared/catalog';
function PrizeDialog({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="award-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none bg-[#F7F7F2] p-8 text-[#252525] backdrop:bg-[#F7F7F2]"
    >
      <div className="grid min-h-full place-items-center">{children}</div>
    </dialog>
  );
}
function Password({ label = 'Password', name = 'password', fresh = false }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Field
        label={label}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={fresh ? 'new-password' : 'current-password'}
        minLength={fresh ? 15 : undefined}
        maxLength={256}
        required
      />
      <button type="button" className="min-h-11 text-xs underline" onClick={() => setShow(!show)}>
        {show ? 'Hide' : 'Show'} password
      </button>
      {fresh && (
        <p className="text-xs text-[#62625C]">At least 15 characters. A few words work well.</p>
      )}
    </div>
  );
}
function Auth() {
  const { command, busy, connected } = useArcade(),
    [mode, setMode] = useState('register'),
    [message, setMessage] = useState('');
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-medium">
        {mode === 'register'
          ? 'Join the arcade'
          : mode === 'login'
            ? 'Welcome back'
            : 'Reset your password'}
      </h1>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await command(
            mode === 'forgot' ? 'forgotPassword' : mode,
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          if (r?.message) setMessage(r.message);
        }}
      >
        {mode === 'register' && (
          <Field label="Full name" name="fullName" autoComplete="name" required />
        )}
        <Field label="BCU email" name="email" type="email" autoComplete="username" required />
        {mode !== 'forgot' && <Password fresh={mode === 'register'} />}
        {mode === 'register' && (
          <>
            <Field label="Course" name="course" required />
            <Select label="Academic year" name="level" defaultValue="" required>
              <option value="" disabled>
                Select academic year
              </option>
              {[
                'Foundation',
                'Year 1',
                'Year 2',
                'Placement',
                'Final year',
                'Postgraduate',
                'Staff',
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </Select>
            <p className="text-xs text-[#62625C]">
              Your public name is generated. Your details are private and deleted after the event
              and prize distribution.
            </p>
            <label className="flex gap-3 text-xs">
              <input type="checkbox" name="consent" value="true" />
              Send me one BCUSCA membership email (optional).
            </label>
          </>
        )}
        <Button className="w-full" disabled={busy || !connected}>
          {mode === 'register'
            ? 'Create account'
            : mode === 'login'
              ? 'Sign in'
              : 'Send reset link'}
        </Button>
      </form>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        {mode !== 'register' && (
          <button className="min-h-11 underline" onClick={() => setMode('register')}>
            Create account
          </button>
        )}
        {mode !== 'login' && (
          <button className="min-h-11 underline" onClick={() => setMode('login')}>
            Sign in
          </button>
        )}
        {mode === 'login' && (
          <button className="min-h-11 underline" onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
function Verify() {
  const now = useClock();
  const { state, command, busy } = useArcade(),
    [message, setMessage] = useState('');
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-medium">Verify your BCU email</h1>
      <p className="text-sm text-[#62625C]">
        Enter the code for {state.me.email}. After verification, you can join the queue.
      </p>
      <p role="status" className="text-xs text-[#62625C]">
        Email: {state.me.verification?.status}
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await command('verify', { code: new FormData(e.currentTarget).get('code') });
        }}
      >
        <Field
          label="Email code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
        <Button disabled={busy}>Verify</Button>
      </form>
      <Button
        secondary
        disabled={busy || now < state.me.verification?.resendAt}
        onClick={async () => {
          const r = await command('sendVerification');
          if (r) setMessage(r.message);
        }}
      >
        {now < state.me.verification?.resendAt
          ? `Resend in ${Math.ceil((state.me.verification.resendAt - now) / 1000)}s`
          : 'Resend email'}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {state.development && (
        <button
          className="block text-xs underline"
          onClick={async () => {
            const r = await (await fetch('/api/development-mail')).json();
            setMessage(r.code ? `Development code: ${r.code}` : 'Email is still queued.');
          }}
        >
          Development email preview
        </button>
      )}
    </div>
  );
}
function EmailAction() {
  const { command, state, busy } = useArcade(),
    [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || ''),
    [message, setMessage] = useState('');
  const reset = location.pathname === '/reset-password';
  useEffect(() => {
    history.replaceState(null, '', location.pathname);
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-medium">
        {reset ? 'Set a new password' : 'Confirm your email'}
      </h1>
      {message ? (
        <>
          <p role="status">{message}</p>
          <a href="/" className="underline">
            Return to Arcade
          </a>
        </>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await command(reset ? 'resetPassword' : 'verify', {
              linkToken: token,
              ...Object.fromEntries(new FormData(e.currentTarget)),
            });
            if (r) setMessage(r.message);
          }}
        >
          {!reset && (
            <p className="text-sm">
              Use the password you chose when registering. Verifying here does not sign this browser
              in automatically.
            </p>
          )}
          {(reset || !state?.me) && <Password fresh={reset} />}
          <Button disabled={busy || !token}>{reset ? 'Set password' : 'Confirm email'}</Button>
        </form>
      )}
    </div>
  );
}
function ScoreRows({ rows }) {
  return (
    <div className="divide-y divide-[#DDDDD5]">
      {rows.map((r) => (
        <div key={r.id || r.accountId} className="flex justify-between gap-4 py-3 text-sm">
          <span>
            {r.rank && `${r.rank}. `}
            {r.alias || gameById(r.gameId)?.name}
            {r.status && (
              <span className="block text-xs text-[#62625C]">
                {new Date(r.ended).toLocaleDateString()} · {r.status.replace('_', ' ')}
              </span>
            )}
          </span>
          <span className="text-right tabular-nums">
            {scoreText(r.score)}
            <span className="block text-xs text-[#62625C]">{grade(r.score)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
function Scores() {
  const { state } = useArcade(),
    [filter, setFilter] = useState('all');
  const me = state.me,
    rank = state.leaderboard.find((r) => r.accountId === me.id);
  const practice = me.attempts
    .filter(
      (a) =>
        a.mode === 'practice' &&
        a.version === SCORING_VERSION &&
        ['completed', 'timed_out', 'abandoned'].includes(a.status) &&
        (filter === 'all' || a.gameId === filter),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-medium">Ranked standings</h1>
        <p className="my-3 text-sm text-[#62625C]">
          {rank
            ? `Your position: ${rank.rank} · Best: ${scoreText(rank.score)}`
            : 'Play Ranked to set a score.'}{' '}
          · {Math.max(0, 3 - me.used)} attempts left
        </p>
        <ScoreRows rows={state.leaderboard} />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-medium">Your Practice top ten</h2>
        <Select label="Game" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All games</option>
          {availableGames(state.config).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        {practice.length ? (
          <ScoreRows rows={practice} />
        ) : (
          <p className="mt-4 text-sm text-[#62625C]">No Practice scores yet.</p>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-medium">Review your recent sessions</h2>
        {me.attempts
          .filter((a) => a.version === SCORING_VERSION && a.review?.length)
          .slice(-10)
          .reverse()
          .map((a) => (
            <details key={a.id} className="border-b border-[#DDDDD5] py-3">
              <summary className="min-h-11 text-sm">
                {gameById(a.gameId)?.name} · {scoreText(a.score)}
              </summary>
              {a.review.map((q, i) => (
                <div key={q.id || i} className="my-4">
                  {q.kind === 'puzzle' ? (
                    <PuzzleReveal q={q} result={q} />
                  ) : (
                    <Question
                      question={q}
                      gameId={a.gameId}
                      reveal
                      submitted={q.selected}
                      points={q.points}
                    />
                  )}
                </div>
              ))}
            </details>
          ))}
      </section>
      <section>
        <h2 className="text-xl font-medium">Recent Live games</h2>
        {me.liveResults.map((r) => (
          <p key={r.id} className="flex justify-between py-3 text-sm">
            <span>
              {gameById(r.gameId)?.name}
              {r.won ? ' · Winner' : ''}
            </span>
            <span>{(r.score / 1000000).toFixed(1)} points</span>
          </p>
        ))}
      </section>
    </div>
  );
}
function LivePlay() {
  const { state, command } = useArcade(),
    live = state.live,
    entry = state.me.liveEntry;
  if (live.phase === 'introduction')
    return (
      <>
        <Tutorial gameId={live.gameId} />
        <p className="mt-3 text-sm">
          Starts in <Timer until={live.until} />
        </p>
      </>
    );
  if (live.phase === 'wheel') return <Wheel selection={live.selection} />;
  if (['lobby', 'countdown'].includes(live.phase))
    return (
      <div className="space-y-6 py-8">
        <h1 className="text-2xl font-medium">
          {live.phase === 'lobby' ? 'You’re in' : gameById(live.gameId)?.name}
        </h1>
        <Timer large until={live.until} />
        <p className="text-sm text-[#62625C]">Your solo queue position is saved.</p>
      </div>
    );
  if (live.phase === 'winner') {
    const own = live.roster.find((e) => e.accountId === state.me.id);
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-medium">
          {live.winners?.includes(state.me.id) ? 'You won!' : 'Well played.'}
        </h1>
        <p className="text-4xl font-medium">
          {((own?.score || 0) / 1000000).toFixed(1)} <span className="text-base">points</span>
        </p>
        <p className="text-sm">
          {live.prizeRecipients?.includes(state.me.id)
            ? 'Speak to the host for your small prize.'
            : 'Solo play resumes shortly.'}
        </p>
      </div>
    );
  }
  if (live.phase === 'cancelled') return <p>{live.message}. Solo play resumes shortly.</p>;
  const reveal = ['execution', 'reveal'].includes(live.phase),
    own = live.roster.find((e) => e.accountId === state.me.id);
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="font-medium">{gameById(live.gameId)?.name}</h1>
        {live.gameId === 'robot' && (
          <span className={cx('rounded-full px-3 py-1 text-xs', markerClass(own?.mark || 1))}>
            Your robot: {own?.mark}
          </span>
        )}
        <Timer until={live.until} />
      </div>
      {live.question?.kind === 'puzzle' ? (
        reveal ? (
          live.phase === 'execution' ? (
            <PuzzleExecution
              q={live.question}
              execution={{
                id: live.id,
                started: live.phaseAt,
                until: live.until,
                selected: entry.answer,
                result: own?.result,
              }}
            />
          ) : (
            <PuzzleReveal q={live.question} result={{ ...own?.result, selected: entry.answer }} />
          )
        ) : (
          <>
            <p className="text-sm">
              {live.question.prompt ||
                'Plan your route, then lock it. Execution is revealed together.'}
            </p>
            <PuzzleEditor
              key={live.question.id}
              q={live.question}
              live
              locked={entry.submitted}
              onSubmit={(program) =>
                command('liveAnswer', { program, challengeId: live.question.id })
              }
            />
          </>
        )
      ) : (
        <Question
          key={live.question.id}
          question={live.question}
          gameId={live.gameId}
          reveal={reveal}
          locked={entry.submitted}
          submitted={entry.answer ?? undefined}
          onSubmit={(answer) => command('liveAnswer', { answer, challengeId: live.question.id })}
        />
      )}
    </div>
  );
}
function Play() {
  const { state, command, busy } = useArcade(),
    [mode, setMode] = useState('practice');
  const [confirm, confirmation] = useConfirmation();
  const a = state.active,
    me = state.me;
  if (
    !me.eligible &&
    !(a?.accountId === me.id && ['playing', 'result'].includes(a.phase)) &&
    !(me.liveEntry && state.live?.phase !== 'lobby')
  )
    return <Verify />;
  if (me.liveEntry && state.live) return <LivePlay />;
  if (a?.accountId === me.id) {
    if (a.phase === 'called')
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-medium">Your turn</h1>
          <p>Ready at the stall?</p>
          <Button disabled={busy} onClick={() => command('ready')}>
            I’m ready
          </Button>
          <Timer until={a.until} />
        </div>
      );
    if (a.phase === 'introduction')
      return (
        <div className="space-y-4">
          <Tutorial gameId={a.gameId} />
          <Button disabled={busy} onClick={() => command('tutorialReady')}>
            I’m ready
          </Button>
          <p className="text-xs text-[#62625C]">
            Confirm within <Timer until={a.until} /> to keep this turn. No Ranked start used yet.
          </p>
        </div>
      );
    if (a.phase === 'wheel') return <Wheel selection={a.selection} />;
    if (a.phase === 'countdown')
      return (
        <div className="space-y-6 py-12 text-center">
          <h1 className="text-2xl font-medium">{gameById(a.gameId)?.name}</h1>
          <Timer large until={a.until} />
        </div>
      );
    if (a.phase === 'playing')
      return (
        <>
          {confirmation}
          <Game active={a} />
          <button
            className="mt-4 min-h-11 text-xs underline"
            onClick={async () => {
              if (
                await confirm(
                  a.mode === 'ranked'
                    ? 'End this session? Your Ranked start remains used. The clock continues while this message is open.'
                    : 'End this Practice session? The clock continues while this message is open.',
                )
              )
                command('quit', { attemptId: a.attemptId });
            }}
          >
            End session
          </button>
        </>
      );
    const attempt = me.attempts.find((t) => t.id === a.attemptId);
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-medium">
          {attempt?.firstScore
            ? 'First score'
            : attempt?.personalBest
              ? 'New personal best'
              : 'Your result'}
        </h1>
        <Score value={a.game.score} />
        <p className="text-sm text-[#62625C]">{gameById(a.gameId)?.name}</p>
        {attempt?.improvement > 0 && (
          <p className="text-sm">+{scoreText(attempt.improvement)} above your previous best</p>
        )}
        <p className="text-sm">Join again when this result closes.</p>
        <details>
          <summary className="min-h-11 text-sm">Score breakdown</summary>
          {attempt?.breakdown?.map((q, i) => (
            <p key={i} className="py-2 text-xs">
              Level {i + 1}: {scoreText(q.points)} · {q.correct ? 'Correct' : 'Not solved'} ·{' '}
              {(q.elapsedMs / 1000).toFixed(3)}s
            </p>
          ))}
        </details>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {state.live?.phase === 'lobby' && !me.liveEntry && (
        <section className="rounded-xl border border-[#365E53] p-4">
          <h2 className="mb-3 text-xl font-medium">Join Live</h2>
          <Button disabled={busy} onClick={() => command('joinLive', { liveId: state.live.id })}>
            Join live game
          </Button>
        </section>
      )}
      {me.queue ? (
        <>
          <h1 className="text-3xl font-medium">You’re in the queue</h1>
          <p className="text-5xl tabular-nums">{me.queue.position - 1}</p>
          <p className="text-sm">people ahead</p>
          <p className="text-xs text-[#62625C]">
            {state.config.paused
              ? 'Queue paused by the host.'
              : me.queue.waitingForVerification
                ? 'Verify your email to keep moving.'
                : me.queue.estimateMinutes
                  ? `Allow up to about ${me.queue.estimateMinutes} minutes, including planned Live play. Timing may change.`
                  : 'You are next when the current activity finishes.'}
          </p>
          <p className="text-sm text-[#62625C]">
            {me.alias} · {me.queue.mode}
          </p>
          <Button secondary onClick={() => command('leave')}>
            Leave queue
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-[#62625C]">{me.alias}</p>
          <h1 className="text-3xl font-medium">Ready to play?</h1>
          {me.turnNotice && (
            <p role="status" className="text-sm">
              {me.turnNotice}
            </p>
          )}
          <GameHelp />
          <div className="grid grid-cols-2 gap-3">
            {['practice', 'ranked'].map((v) => (
              <button
                key={v}
                className={cx(
                  'min-h-20 rounded-lg border p-4 text-left capitalize',
                  mode === v ? 'border-[#365E53] bg-[#E9EDE6]' : 'border-[#DDDDD5] bg-white',
                )}
                onClick={() => setMode(v)}
              >
                {v}
                <span className="mt-2 block text-xs normal-case text-[#62625C]">
                  {v === 'practice'
                    ? 'Play for the challenge'
                    : `${Math.max(0, 3 - me.used)} attempts left`}
                </span>
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={
              busy ||
              !!state.admissionsReason ||
              (mode === 'ranked' && (!state.config.rankedEnabled || me.used >= 3))
            }
            onClick={() => command('enqueue', { mode })}
          >
            Join queue
          </Button>
          <p className="text-sm text-[#62625C]">
            {state.admissionsReason ||
              (mode === 'ranked' && !state.config.rankedEnabled ? 'Ranked is currently off.' : '')}
          </p>
        </>
      )}
    </div>
  );
}
export function Player() {
  const { state, command, connectionId, busy } = useArcade(),
    [tab, setTab] = useState('play'),
    [message, setMessage] = useState('');
  const claimed = useRef(null);
  const focused =
    (state?.active?.accountId === state?.me?.id &&
      ['wheel', 'introduction', 'countdown', 'playing'].includes(state?.active?.phase)) ||
    (!!state?.me?.liveEntry &&
      !!state?.live &&
      !['winner', 'cancelled'].includes(state.live.phase));
  const me = state?.me;
  useEffect(() => {
    setTab('play');
    claimed.current = null;
  }, [me?.id]);
  useEffect(() => {
    if (!busy && me && connectionId && claimed.current !== connectionId && !me.inputOwned) {
      claimed.current = connectionId;
      command('claimPlayerControl');
    }
  }, [me?.id, connectionId, busy]);
  const award = me?.awards.find((a) => a.type === 'grand' && !a.acknowledged && !a.forfeited);
  const actionPage = ['/verify', '/reset-password'].includes(location.pathname);
  return (
    <div className="mx-auto min-h-svh max-w-lg px-5 py-7">
      <header className="mb-8 flex items-center justify-between">
        <Wordmark />
        {me && !focused && (
          <button
            className="min-h-11 text-xs"
            onClick={() => setTab(tab === 'account' ? 'play' : 'account')}
          >
            {tab === 'account' ? 'Back' : 'Account'}
          </button>
        )}
      </header>
      <Notice />
      {!focused &&
        me?.notifications?.map((n) => (
          <div
            key={n.id}
            role="status"
            className="mb-4 rounded-lg border border-[#365E53] p-4 text-sm"
          >
            <strong>{n.title}</strong>
            <p>{n.body}</p>
            <button
              className="min-h-11 underline"
              onClick={() => command('ackNotification', { id: n.id })}
            >
              Dismiss
            </button>
          </div>
        ))}
      {actionPage ? (
        <EmailAction />
      ) : !state ? (
        <p>Connecting…</p>
      ) : !me ? (
        <Auth />
      ) : (
        <>
          {!focused && (
            <nav className="mb-6 flex gap-6 border-b border-[#DDDDD5]">
              {['play', 'scores', 'updates'].map((v) => (
                <button
                  key={v}
                  className={cx(
                    'min-h-11 capitalize',
                    tab === v ? 'font-medium' : 'text-[#62625C]',
                  )}
                  onClick={() => {
                    setTab(v);
                    if (v === 'updates') command('readUpdates');
                  }}
                >
                  {v}
                  {v === 'updates' && me.unreadUpdates && (
                    <span
                      aria-label="Unread updates"
                      className="ml-2 inline-block size-2 rounded-full bg-[#365E53]"
                    />
                  )}
                </button>
              ))}
            </nav>
          )}
          {focused && !me.inputOwned ? (
            <div className="space-y-4">
              <p>This account is open on another controller.</p>
              <Button
                disabled={busy}
                onClick={() => command('claimPlayerControl', { confirm: true })}
              >
                Take control here
              </Button>
            </div>
          ) : focused ? (
            <Play />
          ) : tab === 'account' ? (
            <div className="space-y-5">
              <h1 className="text-2xl font-medium">Your account</h1>
              {me.profileEditable ? (
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const r = await command(
                      'updateProfile',
                      Object.fromEntries(new FormData(e.currentTarget)),
                    );
                    if (r) setMessage(r.message);
                  }}
                >
                  <Field label="Full name" name="fullName" defaultValue={me.fullName} required />
                  <Field label="Course" name="course" defaultValue={me.course} required />
                  <Field label="Academic year" name="level" defaultValue={me.level} required />
                  <Button secondary>Save details</Button>
                </form>
              ) : (
                <p>{me.fullName}</p>
              )}
              <p className="text-sm">
                {me.email}
                <br />
                {me.course} · {me.level}
              </p>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await command(
                    'changePassword',
                    Object.fromEntries(new FormData(e.currentTarget)),
                  );
                  if (r) setMessage(r.message);
                }}
              >
                <Password label="Current password" name="currentPassword" />
                <Password label="New password" fresh />
                <Button>Change password</Button>
              </form>
              {message && <p>{message}</p>}
              <Button secondary onClick={() => command('logout')}>
                Sign out
              </Button>
            </div>
          ) : tab === 'scores' ? (
            <Scores />
          ) : tab === 'updates' ? (
            <div className="space-y-6">
              <h1 className="text-2xl font-medium">Updates</h1>
              {state.updates.map((u) => (
                <article key={u.id}>
                  <h2 className="font-medium">{u.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#62625C]">{u.body}</p>
                </article>
              ))}
            </div>
          ) : !me.inputOwned && me.eligible ? (
            <div className="space-y-4">
              <p>This account is open on another controller.</p>
              <Button onClick={() => command('claimPlayerControl', { confirm: true })}>
                Take control here
              </Button>
            </div>
          ) : (
            <Play />
          )}
        </>
      )}
      {award && !actionPage && !focused && (
        <PrizeDialog onClose={() => command('ackAward', { id: award.id })}>
          <div className="max-w-sm space-y-6">
            <p className="text-sm text-[#365E53]">BCUSCA Arcade</p>
            <h1 id="award-title" className="text-4xl font-medium">
              You won a grand prize!
            </h1>
            <p className="text-sm">{award.instructions}</p>
            <p className="text-sm text-[#62625C]">
              {award.mailStatus === 'sent'
                ? `Instructions sent to ${me.email}. Keep an eye on your inbox.`
                : award.mailStatus === 'failed'
                  ? 'Email needs attention. Please speak to the host.'
                  : 'Your instructions email is queued.'}
            </p>
            <Button onClick={() => command('ackAward', { id: award.id })}>Got it</Button>
          </div>
        </PrizeDialog>
      )}
      {me?.awards.some((a) => a.type === 'grand' && a.acknowledged) && tab === 'scores' && (
        <section className="mt-6 rounded-lg border border-[#365E53] p-4">
          <h2 className="font-medium">Your grand prize</h2>
          {me.awards
            .filter((a) => a.type === 'grand')
            .map((a) => (
              <p key={a.id} className="mt-2 text-sm">
                {a.collected ? 'Collected' : a.instructions}
              </p>
            ))}
        </section>
      )}
    </div>
  );
}
