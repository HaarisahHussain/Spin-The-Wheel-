import { SCORING_VERSION } from '../shared/catalog.js';
import { LEVEL_CAPS, LEVEL_MAXIMA, MAX_RUNS, scoreChallenge } from '../shared/scoring.js';
import { TIMING } from '../shared/timing.js';
import { adapterFor } from './games/registry.js';
import { seed } from './games/generate.js';
export { question } from './games/quiz.js';
export function generate(id, level, recent = []) {
  let q;
  for (let i = 0; i < 32; i++) {
    q = adapterFor(id).create(level, seed(), recent.at(-1)?.family);
    if (!recent.some((r) => r.fingerprint === q.fingerprint)) break;
  }
  recent.push({ fingerprint: q.fingerprint, family: q.family });
  if (recent.length > 100) recent.splice(0, recent.length - 100);
  return q;
}
export function newGame(id, now, recent = []) {
  const g = {
    id,
    version: SCORING_VERSION,
    level: 0,
    score: 0,
    started: now,
    history: [],
    complete: false,
    recent,
  };
  openQuestion(g, now);
  return g;
}
function openQuestion(g, now) {
  g.question = generate(g.id, g.level, g.recent);
  g.phase = 'question';
  g.feedback = null;
  g.execution = null;
  g.questionAt = now;
  g.allowance = LEVEL_CAPS[g.level];
  g.remainingMs = g.allowance;
  g.elapsedMs = 0;
  g.runs = 0;
  g.deadline = now + g.allowance;
}
function closeQuestion(g, selected, result, now, timedOut = false) {
  const elapsed = g.elapsedMs;
  const points = scoreChallenge({
    ...result,
    elapsed,
    allowance: g.allowance,
    maximum: LEVEL_MAXIMA[g.level],
    runs: g.runs,
    puzzle: adapterFor(g.id).kind === 'puzzle',
  });
  g.score += points;
  g.feedback = {
    ...g.question,
    ...result,
    selected,
    points,
    elapsedMs: elapsed,
    runs: g.runs,
    allowanceMs: g.allowance,
    timedOut,
  };
  g.history.push(g.feedback);
  g.phase = 'feedback';
  g.feedbackUntil = now + TIMING.feedback;
}
export function answerGame(g, answer, challengeId, now, receivedAt = now) {
  if (
    g.complete ||
    g.phase !== 'question' ||
    receivedAt >= g.deadline ||
    g.question.id !== challengeId
  )
    return false;
  const a = adapterFor(g.id);
  if (!a.valid(g.question, answer)) return false;
  const result = a.evaluate(g.question, answer);
  g.elapsedMs += Math.max(0, receivedAt - g.questionAt);
  g.remainingMs = Math.max(0, g.allowance - g.elapsedMs);
  if (a.kind === 'puzzle') {
    g.runs++;
    g.question.program = structuredClone(answer);
    g.execution = {
      id: crypto.randomUUID(),
      started: now,
      until:
        now +
        (g.id === 'parcel'
          ? TIMING.execution
          : Math.min(
              TIMING.execution,
              Math.max(
                600,
                ((result.path?.length || result.frames?.length || 1) -
                  1 +
                  (result.failedIndex !== undefined ? 1 : 0)) *
                  220,
              ),
            )),
      selected: structuredClone(answer),
      result,
    };
    g.phase = 'execution';
  } else closeQuestion(g, answer, result, now);
  return true;
}
export function tickGame(g, now) {
  if (g.complete) return;
  if (g.phase === 'question' && now >= g.deadline) {
    g.elapsedMs = g.allowance;
    g.remainingMs = 0;
    closeQuestion(g, null, { correct: false, efficiency: 0 }, now, true);
  } else if (g.phase === 'execution' && now >= g.execution.until) {
    const e = g.execution;
    if (e.result.correct || g.runs >= MAX_RUNS || g.remainingMs <= 0)
      closeQuestion(g, e.selected, e.result, now);
    else {
      g.phase = 'question';
      g.questionAt = now;
      g.deadline = now + g.remainingMs;
      g.question.feedback = e.result.feedback || 'Try another route.';
      g.question.failedIndex = e.result.failedIndex;
      g.question.lastResult = e.result;
      g.execution = null;
    }
  } else if (g.phase === 'feedback' && now >= g.feedbackUntil) {
    g.level++;
    if (g.level >= LEVEL_MAXIMA.length) {
      g.complete = true;
      g.completionStatus = 'completed';
    } else openQuestion(g, now);
  }
}
export function publicQuestion(q, reveal = false) {
  if (!q) return null;
  const keys = [
    'id',
    'kind',
    'game',
    'level',
    'code',
    'prompt',
    'choices',
    'editableLines',
    'size',
    'start',
    'goal',
    'blocks',
    'maxMoves',
    'depth',
    'groups',
    'packets',
    'depots',
    'target',
    'allowRepeat',
    'items',
    'gates',
    'rules',
    'fallback',
    'maxTiles',
    'starter',
  ];
  const out = Object.fromEntries(keys.filter((k) => q[k] !== undefined).map((k) => [k, q[k]]));
  if (q.game === 'robot') out.position = q.start;
  if (reveal) {
    out.answer = q.answer;
    out.solution = q.solution;
    out.correctedLine = q.correctedLine;
    out.explanation = q.explanation;
  }
  return out;
}
export function publicGame(g, own = false) {
  if (!g) return null;
  const resultKeys = [
    'correct',
    'selected',
    'points',
    'timedOut',
    'path',
    'frames',
    'painted',
    'routes',
    'failedIndex',
    'failedCell',
    'feedback',
    'elapsedMs',
    'allowanceMs',
    'efficiency',
    'runs',
    'events',
    'failedSource',
  ];
  const safeResult = (r) =>
    Object.fromEntries(resultKeys.filter((k) => r?.[k] !== undefined).map((k) => [k, r[k]]));
  const feedback =
    g.phase === 'feedback'
      ? { ...publicQuestion(g.feedback, true), ...safeResult(g.feedback) }
      : null;
  const execution =
    g.phase === 'execution'
      ? {
          id: g.execution.id,
          started: g.execution.started,
          until: g.execution.until,
          selected: g.execution.selected,
          result: safeResult(g.execution.result),
        }
      : null;
  // Results are only displayed after playback; the path is the submitted program, never the solution.
  return {
    id: g.id,
    level: g.level,
    phase: g.phase,
    remainingMs: g.remainingMs,
    score: g.score,
    deadline: g.deadline,
    questionAt: g.questionAt,
    feedbackUntil: g.feedbackUntil,
    complete: g.complete,
    runs: g.runs,
    maxRuns: MAX_RUNS,
    feedback,
    execution,
    question: feedback || {
      ...publicQuestion(g.question),
      ...(own
        ? {
            program: g.question.program || [],
            feedback: g.question.feedback || '',
            failedIndex: g.question.failedIndex,
            lastResult: safeResult(g.question.lastResult),
          }
        : {}),
    },
  };
}
