import { InformationLinks } from './Information';
import { useDetails } from '../useDetails';
import { useConfirmation } from '../components/useConfirmation';
import { Tutorial, GameHelp } from '../games/Tutorial';
import { useEffect, useState, useRef } from 'react';
import { useArcade } from '../state';
import { Wordmark, Notice, Button, Field, Select, Timer, Score, cx } from '../components/ui';
import { Wheel } from '../components/Wheel';
import { Game, Question } from '../games/Game';
import { PuzzleEditor, PuzzleReveal, PuzzleExecution, markerClass } from '../games/Puzzles';
import { gameById, availableGames, scoreText, grade } from '../../shared/catalog';
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
function SessionReview({ attempt }) {
  const [open, setOpen] = useState(false);
  const { data, error, loading } = useDetails('review', { id: attempt.id }, open);
  return (
    <details
      className="border-b border-[#DDDDD5] py-3"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="min-h-11 text-sm">
        {gameById(attempt.gameId)?.name} · {scoreText(attempt.score)}
      </summary>
      {open &&
        (error ? (
          <p role="alert">{error}</p>
        ) : loading ? (
          <p>Loading…</p>
        ) : (
          data?.review.map((q, i) => (
            <div key={q.id || i} className="my-4">
              {q.kind === 'puzzle' ? (
                <PuzzleReveal q={q} result={q} />
              ) : (
                <Question
                  question={q}
                  gameId={attempt.gameId}
                  reveal
                  submitted={q.selected}
                  points={q.points}
                />
              )}
            </div>
          ))
        ))}
    </details>
  );
}
function Scores() {
  const { state } = useArcade(),
    [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const scores = useDetails('scores', { game: filter });
  const standings = useDetails('leaderboard', { offset });
  const me = state.me,
    rank = me.rank;
  const best = scores.data?.best || [];
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-medium">Leaderboard</h1>
        <p className="my-3 text-sm text-[#62625C]">
          {rank
            ? `Your position: ${rank.rank} · Best: ${scoreText(rank.score)}`
            : 'Play any game to set a score.'}
        </p>
        {standings.error && <p role="alert">{standings.error}</p>}
        <ScoreRows rows={standings.data?.rows || state.leaderboard} />
        <div className="flex gap-3">
          {offset > 0 && (
            <Button secondary onClick={() => setOffset(Math.max(0, offset - 50))}>
              Previous
            </Button>
          )}
          {offset + 50 < (standings.data?.total || 0) && (
            <Button secondary onClick={() => setOffset(offset + 50)}>
              Next
            </Button>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-medium">Your top ten</h2>
        <Select label="Game" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All games</option>
          {availableGames(state.config).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        {scores.error && <p role="alert">{scores.error}</p>}
        {best.length ? (
          <ScoreRows rows={best} />
        ) : (
          <p className="mt-4 text-sm text-[#62625C]">No scores yet.</p>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-medium">Review your recent sessions</h2>
        {(scores.data?.recent || []).map((a) =>
          a.hasReview ? (
            <SessionReview key={a.id} attempt={a} />
          ) : (
            <ScoreRows key={a.id} rows={[a]} />
          ),
        )}
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
          {own?.personalBest
            ? 'New personal best'
            : live.winners?.includes(state.me.id)
              ? 'You won!'
              : 'Well played.'}
        </h1>
        <p className="text-4xl font-medium">
          {scoreText(own?.score)} <span className="text-base">/ 9</span>
        </p>
        <p className="text-sm">
          Your score counts towards the leaderboard. Solo play resumes shortly.
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
  const { state, command, busy } = useArcade();
  const [confirm, confirmation] = useConfirmation();
  const a = state.active,
    me = state.me;
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
            Ready within <Timer until={a.until} />. Your attempt starts after the countdown.
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
                  'End this session? Your earned points will be saved. The clock continues while this message is open.',
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
              : me.queue.estimateMinutes
                ? `About ${me.queue.estimateMinutes} minutes including Live games.`
                : 'You are next when the current activity finishes.'}
          </p>
          <p className="text-sm text-[#62625C]">{me.alias}</p>
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
          <Button
            className="w-full"
            disabled={busy || !!state.admissionsReason}
            onClick={() => command('enqueue')}
          >
            Join queue
          </Button>
          <p className="text-sm text-[#62625C]">{state.admissionsReason}</p>
        </>
      )}
    </div>
  );
}
export function Player() {
  const { state, command, connectionId, busy, connected } = useArcade();
  const [tab, setTab] = useState('play'),
    [message, setMessage] = useState('');
  const claimed = useRef(null),
    guestRequested = useRef(false);
  const me = state?.me;
  const focused =
    (me &&
      state.active?.accountId === me.id &&
      ['wheel', 'introduction', 'countdown', 'playing'].includes(state.active.phase)) ||
    (!!me?.liveEntry && !!state?.live && !['winner', 'cancelled'].includes(state.live.phase));
  useEffect(() => {
    if (state && connected && !me && !guestRequested.current && !busy) {
      guestRequested.current = true;
      command('guest');
    }
  }, [state, connected, me?.id, busy]);
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
      {!state ? (
        <p>Connecting…</p>
      ) : !me ? (
        <div className="space-y-4">
          <p>{busy ? 'Getting ready…' : 'Ready when you are.'}</p>
          {!busy && (
            <Button disabled={!connected} onClick={() => command('guest')}>
              Start playing
            </Button>
          )}
        </div>
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
          {!me.inputOwned && (focused || tab === 'play') ? (
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
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const result = await command(
                    'updateProfile',
                    Object.fromEntries(new FormData(e.currentTarget)),
                  );
                  if (result) setMessage(result.message);
                }}
              >
                <Field
                  label="Username"
                  name="alias"
                  defaultValue={me.alias}
                  minLength={3}
                  maxLength={24}
                  pattern="[a-zA-Z0-9_-]{3,24}"
                  required
                />
                <p className="text-xs text-[#62625C]">
                  3–24 letters, numbers, underscores or hyphens. Shown publicly.
                </p>
                <Field
                  label="Your name (optional)"
                  name="fullName"
                  maxLength={120}
                  defaultValue={me.fullName}
                />
                <p className="text-xs text-[#62625C]">Your name is only visible to the host.</p>
                <Button disabled={busy}>Save</Button>
                {message && (
                  <p role="status" className="text-sm">
                    {message}
                  </p>
                )}
              </form>
              <p className="text-sm text-[#62625C]">
                This account stays on this browser for up to seven days. Clearing cookies or
                changing devices creates a new account. Usernames cannot recover accounts.
              </p>
            </div>
          ) : tab === 'scores' ? (
            <Scores />
          ) : tab === 'updates' ? (
            <div className="space-y-6">
              <h1 className="text-2xl font-medium">Updates</h1>
              {!state.updates.length && <p className="text-sm text-[#62625C]">No updates yet.</p>}
              {state.updates.map((u) => (
                <article key={u.id}>
                  <h2 className="font-medium">{u.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#62625C]">{u.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <Play />
          )}
        </>
      )}
      {!focused && <InformationLinks />}
    </div>
  );
}
