import { DisplaySound } from '../components/DisplaySound';
import { Tutorial } from '../games/Tutorial';
import { PuzzleView, RobotRace, LivePuzzleExecution } from '../games/Puzzles';
import { QRCodeSVG } from 'qrcode.react';
import { useArcade } from '../state';
import { Wordmark, Leaderboard, Timer, Score, Notice } from '../components/ui';
import { LiveStatus } from '../components/LiveStatus';
import { Wheel } from '../components/Wheel';
import { Game, Question } from '../games/Game';
import { gameById } from '../../shared/catalog';
export function JoinDisplay() {
  const { state, connected } = useArcade();
  if (!state) return <div className="p-12">Connecting…</div>;
  const live = state.live;
  return (
    <div className="flex h-svh flex-col px-[5vw] py-[5vh]">
      <header className="mb-[6vh]">
        <Wordmark display />
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-[.9fr_1.1fr] items-center gap-[7vw]">
        <section>
          <h1 className="mb-8 text-[clamp(32px,3vw,48px)] font-medium leading-tight tracking-tight">
            Scan to play.
          </h1>
          <div className="inline-block rounded-xl bg-white p-6">
            <QRCodeSVG
              value={state.origin}
              size={320}
              level="M"
              marginSize={2}
              className="h-[min(32vh,320px)] w-[min(32vh,320px)]"
            />
          </div>
          <p className="mt-2 text-lg text-[#62625C]">{state.origin.replace(/^https?:\/\//, '')}</p>
        </section>
        <section className="self-center">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-[clamp(24px,2.6vw,40px)] font-medium tracking-tight">
              Leaderboard
            </h2>
            <span className="text-base text-[#62625C]">Top 5</span>
          </div>
          {state.leaderboard.length ? (
            <Leaderboard rows={state.leaderboard} limit={5} display />
          ) : (
            <p className="text-lg text-[#62625C]">Play any game to set the first score.</p>
          )}
        </section>
      </main>
      <footer className="mt-[5vh] flex items-center justify-between border-t border-[#DDDDD5] pt-5 text-xl text-[#62625C]">
        <span>
          {!connected
            ? 'Reconnecting · standings may be outdated'
            : state.config.paused
              ? 'Admissions paused'
              : live
                ? live.phase === 'lobby'
                  ? `Live lobby · ${live.roster.length} joined`
                  : 'Live game in progress'
                : state.next[0]
                  ? `Up next · ${state.next[0].alias}`
                  : state.open
                    ? 'The Arcade is open'
                    : state.admissionsReason || 'Admissions closed'}
        </span>
        <span>{live?.phase === 'lobby' ? <Timer until={live.until} /> : <LiveStatus />}</span>
      </footer>
    </div>
  );
}
function LiveDisplay({ live }) {
  if (live.phase === 'lobby')
    return (
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-5 text-2xl text-[#62625C]">
          {gameById(live.gameId)?.name || 'Live arcade'}
        </p>
        <h1 className="text-6xl font-medium tracking-tight">Join Live on your phone.</h1>

        <div className="flex justify-center gap-16 text-2xl text-[#62625C]">
          <span>{live.roster.length} joined</span>
          <Timer until={live.until} />
        </div>
      </div>
    );
  if (live.phase === 'introduction') return <Tutorial gameId={live.gameId} display live />;
  if (live.phase === 'wheel')
    return <Wheel display key={live.selection.id} selection={live.selection} />;
  if (live.phase === 'countdown')
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-5xl font-medium">{gameById(live.gameId)?.name}</h1>
        <Timer large until={live.until} />
      </div>
    );
  if (live.question?.kind === 'puzzle' && ['question', 'execution', 'reveal'].includes(live.phase))
    return (
      <div className="w-full max-w-4xl space-y-4 text-center">
        <div className="flex justify-between">
          <h1 className="text-2xl font-medium">
            {gameById(live.gameId)?.name} ·{' '}
            {live.phase === 'question' ? 'Plan' : live.phase === 'execution' ? 'Running' : 'Result'}
          </h1>
          <Timer until={live.until} />
        </div>
        {live.phase === 'question' ? (
          <>
            <PuzzleView q={live.question} display />
            <p>
              {live.roster.filter((e) => e.submitted).length} / {live.roster.length} locked
            </p>
          </>
        ) : live.gameId === 'robot' ? (
          <RobotRace live={live} />
        ) : (
          <LivePuzzleExecution live={live} />
        )}
        {live.phase === 'reveal' && (
          <p>{live.roster.filter((e) => e.result?.correct).length} solved</p>
        )}
      </div>
    );
  if (live.phase === 'cancelled')
    return (
      <div className="text-center">
        <h1 className="text-5xl font-medium">Solo play resumes.</h1>
        <p className="mt-6 text-2xl text-[#62625C]">{live.message}</p>
      </div>
    );
  if (live.phase === 'winner') {
    const winners = live.roster.filter((e) => live.winners?.includes(e.accountId));
    return (
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-8 text-xl text-[#62625C]">Live result</p>
        <h1 className="text-6xl font-medium">
          {winners.length ? 'Well played.' : 'Thanks for playing.'}
        </h1>
        <div className="my-10 space-y-5">
          {winners.slice(0, 5).map((e) => (
            <div key={e.accountId} className="flex justify-between text-3xl">
              <span>{e.alias}</span>
              <span>{((e.score || 0) / 1000000).toFixed(1)}</span>
            </div>
          ))}
          {winners.length > 5 && <p className="text-xl">{winners.length - 5} more tied winners</p>}
        </div>
        <p className="text-2xl text-[#62625C]">Solo play resumes.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex justify-between text-xl text-[#62625C]">
        <span>Live · Question {live.level + 1} / 5</span>
        <span>
          {live.roster.filter((e) => e.submitted).length} / {live.roster.length} submitted
        </span>
        <Timer until={live.until} />
      </div>
      <Question
        key={live.question.id}
        question={live.question}
        gameId={live.gameId}
        display
        reveal={live.phase === 'reveal'}
      />
    </div>
  );
}
export function PlayDisplay() {
  const { state } = useArcade();
  if (!state) return <div className="p-12">Connecting…</div>;
  const a = state.active;
  return (
    <div className="flex h-svh flex-col px-[5vw] py-[2vh]">
      <header className="flex items-center justify-between gap-4">
        <Wordmark display />
        {a && (
          <p className="text-xl text-[#62625C]">
            {a.alias} <span className="mx-3">/</span> <span className="capitalize">{a.mode}</span>
          </p>
        )}
        <DisplaySound />
      </header>
      <Notice />
      <main className="grid min-h-0 flex-1 place-items-center py-2">
        {state.live ? (
          <LiveDisplay live={state.live} />
        ) : !a ? (
          <div className="w-full space-y-4 text-center">
            {!state.config.paused && state.config.idlePresentation !== 'text' && (
              <Wheel display idle animate={state.config.animateIdleWheel} />
            )}
            {(state.config.paused || state.config.idlePresentation !== 'wheel') && (
              <h1 className="text-4xl font-medium tracking-tight lg:text-5xl">
                {state.config.paused ? 'A short pause.' : 'Ready to play.'}
              </h1>
            )}
            <p className="text-lg text-[#62625C]">
              {state.config.paused ? 'We’ll be back shortly.' : 'Join on the other screen.'}
            </p>
            <p className="text-base text-[#62625C]">
              <LiveStatus />
            </p>
          </div>
        ) : a.phase === 'called' ? (
          <div className="text-center">
            <p className="mb-5 text-2xl text-[#62625C]">You’re up</p>
            <h1 className="text-6xl font-medium">{a.alias}</h1>
            <p className="mt-8 text-2xl text-[#62625C]">Tap Ready on your phone.</p>
          </div>
        ) : a.phase === 'introduction' ? (
          <Tutorial gameId={a.gameId} display />
        ) : a.phase === 'wheel' ? (
          <Wheel display key={a.selection.id} selection={a.selection} />
        ) : a.phase === 'briefing' ? (
          <div className="max-w-3xl text-center">
            <h1 className="text-6xl font-medium">{gameById(a.gameId).name}</h1>
            <p className="mt-8 text-3xl leading-relaxed text-[#62625C]">
              {gameById(a.gameId).description}
            </p>
          </div>
        ) : a.phase === 'countdown' ? (
          <div className="space-y-6 text-center">
            <h1 className="text-5xl font-medium">{gameById(a.gameId)?.name}</h1>
            <Timer large until={a.until} />
          </div>
        ) : a.phase === 'playing' ? (
          <Game active={a} display />
        ) : (
          <div className="space-y-8 text-center">
            <p className="text-2xl text-[#62625C]">Your result</p>
            <Score value={a.game.score} large />
            <p className="text-2xl">{a.alias}</p>
          </div>
        )}
      </main>
    </div>
  );
}
