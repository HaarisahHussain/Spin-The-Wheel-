// Presentation only: server state remains the authority for every result.
export function wheelAngle(selection, now) {
  const progress = Math.min(
    1,
    Math.max(0, (now - selection.startedAt) / (selection.until - selection.startedAt)),
  );
  return (1080 - (selection.sector + 0.5) * 36) * (1 - (1 - progress) ** 3);
}

export function soundScene(state, now) {
  const s = state?.live || state?.active;
  if (!s) return { key: 'idle' };
  const live = Boolean(state.live);
  const id = s.id || s.attemptId || s.selection?.id || s.accountId;
  if (s.phase === 'wheel' && s.selection)
    return {
      key: `wheel:${s.selection.id}`,
      tick: now < s.selection.until ? Math.floor(wheelAngle(s.selection, now) / 36) : null,
    };
  if (s.phase === 'countdown')
    return {
      key: `countdown:${id}:${s.until}`,
      tick: Math.max(0, Math.ceil((s.until - now) / 1000)),
      countdown: true,
    };
  const g = s.game;
  if (
    (!live && s.phase === 'playing' && g?.phase === 'feedback') ||
    (live && s.phase === 'reveal')
  ) {
    const correct = live
      ? s.roster.some((e) => e.result?.correct || e.correct)
      : Boolean(g.feedback?.correct);
    return {
      key: `feedback:${live ? s.id : s.attemptId}:${live ? s.level : g.question.id}:${live ? '' : g.runs}`,
      cue: correct ? 'success' : 'miss',
    };
  }
  if ((!live && s.phase === 'result') || (live && s.phase === 'winner'))
    return {
      key: `finish:${id}`,
      cue: (live ? s.roster.some((e) => e.score > 0) : g?.score > 0) ? 'finish' : 'end',
    };
  return { key: `${id}:${s.phase}:${g?.phase || ''}:${s.level ?? g?.level ?? ''}` };
}

// Deduplicate snapshots; callers seed the previous scene on connect/resume.
export function transitionCue(previous, next) {
  if (!previous) return null;
  if (previous.key !== next.key) {
    if (next.cue) return next.cue;
    if (
      previous.key.startsWith('wheel:') &&
      (next.countdown || /:(introduction|briefing):/.test(next.key))
    )
      return 'selected';
    if (next.countdown && next.tick > 0 && next.tick <= 3) return 'count';
    if (previous.countdown && !next.countdown && /:(playing|question):/.test(next.key)) return 'go';
    return null;
  }
  if (next.tick !== previous.tick && next.tick !== null && next.tick !== undefined) {
    if (next.countdown) return next.tick > 0 && next.tick <= 3 ? 'count' : null;
    return 'tick';
  }
  return null;
}
