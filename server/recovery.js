// A stalled service must not charge a player for unseen question time.
export function recoverServiceDelay(s, now) {
  s.hostLease = null;
  s.controlEpoch++;
  let interrupted = false;
  if (s.active?.phase === 'playing') {
    const attempt = s.attempts.find((a) => a.id === s.active.attemptId);
    if (attempt?.status === 'started') {
      Object.assign(attempt, { status: 'interrupted', score: s.active.game.score, ended: now });
      s.incidents.push({
        id: crypto.randomUUID(),
        attemptId: attempt.id,
        reason: 'Service updates stalled for more than three seconds',
        at: now,
        resolved: false,
      });
    }
    s.active = null;
    interrupted = true;
  }
  if (s.live && !['winner', 'cancelled'].includes(s.live.phase)) {
    Object.assign(s.live, {
      phase: 'cancelled',
      message: 'Connection interrupted. Solo play resumes after host review.',
      until: now + 3000,
    });
    s.config.soloAfterLive = true;
    interrupted = true;
  }
  if (interrupted) {
    s.config.paused = true;
    s.config.livePending = false;
  }
}
