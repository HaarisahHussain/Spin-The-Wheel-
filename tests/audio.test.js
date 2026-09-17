import test from 'node:test';
import assert from 'node:assert/strict';
import { soundScene, transitionCue, wheelAngle } from '../src/audio/cues.js';

test('wheel sound follows sectors and skips stale ticks instead of catching up', () => {
  const selection = { id: 'spin', sector: 3, startedAt: 1000, until: 6000 };
  const state = { active: { phase: 'wheel', selection } };
  const first = soundScene(state, 1000),
    later = soundScene(state, 3000);
  assert.equal(transitionCue(null, first), null);
  assert.equal(transitionCue(first, first), null);
  assert.equal(transitionCue(first, later), 'tick');
  assert.equal(transitionCue(later, soundScene(state, 7000)), null);
  assert.equal(wheelAngle(selection, 8000), 954);
  assert.equal(transitionCue(later, { key: 'spin:introduction::' }), 'selected');
  assert.equal(transitionCue(later, { key: 'spin:cancelled::' }), null);
});
test('solo and Live outcomes announce actual correctness once and never leak during execution', () => {
  const g = { phase: 'execution', question: { id: 'q' }, feedback: { correct: true }, runs: 1 };
  const s = { active: { attemptId: 'a', phase: 'playing', game: g } };
  const executing = soundScene(s, 0);
  assert.equal(executing.cue, undefined);
  g.phase = 'feedback';
  const success = soundScene(s, 0);
  assert.equal(transitionCue(executing, success), 'success');
  assert.equal(transitionCue(success, soundScene(s, 0)), null);
  g.question.id = 'q2';
  g.feedback.correct = false;
  assert.equal(transitionCue(success, soundScene(s, 0)), 'miss');
  const live = { id: 'l', phase: 'reveal', level: 0, roster: [{ result: { correct: true } }] };
  assert.equal(soundScene({ live }, 0).cue, 'success');
  live.roster = [{ correct: false }];
  assert.equal(soundScene({ live }, 0).cue, 'miss');
  live.phase = 'winner';
  live.roster[0].score = 100;
  assert.equal(soundScene({ live }, 0).cue, 'finish');
  live.roster[0].score = 0;
  assert.equal(soundScene({ live }, 0).cue, 'end');
});
test('countdown is limited to the last three seconds and a start cue', () => {
  const state = { active: { attemptId: 'a', phase: 'countdown', until: 10000 } };
  const at = (now) => soundScene(state, now);
  assert.equal(transitionCue(at(5000), at(6000)), null);
  assert.equal(transitionCue(at(6000), at(7000)), 'count');
  assert.equal(transitionCue(at(7000), at(7050)), null);
  assert.equal(transitionCue(at(9000), { key: 'a:playing:question:0' }), 'go');
});
