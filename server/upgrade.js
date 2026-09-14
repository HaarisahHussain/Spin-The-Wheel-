export function upgradeGuestEvent(s) {
  if (s.config.releaseVersion === '1.1.0') return;
  if (s.active || (s.live && s.live.phase !== 'winner'))
    throw Error('Finish active games before upgrading to v1.1.0. No event data was changed.');
  const seen = new Set();
  for (const a of Object.values(s.accounts)) {
    let alias = typeof a.alias === 'string' ? a.alias : `Player-${a.id.slice(0, 8)}`;
    if (!/^[a-zA-Z0-9_-]{3,24}$/.test(alias) || seen.has(alias.toLowerCase()))
      alias = `Player-${a.id.slice(0, 8)}`;
    while (seen.has(alias.toLowerCase())) alias = `Player-${crypto.randomUUID().slice(0, 8)}`;
    seen.add(alias.toLowerCase());
    a.alias = alias;
    for (const key of [
      'email',
      'password',
      'verified',
      'course',
      'level',
      'consent',
      'replacementOf',
    ])
      delete a[key];
  }
  for (const a of s.attempts) {
    a.mode = 'solo';
    delete a.verified;
    delete a.replacementOf;
  }
  for (const q of s.queue) {
    q.mode = 'solo';
    delete q.heldUntil;
  }
  // Legacy Live sessions used a 1,000-point total; preserve their achieved proportion.
  for (const a of s.liveResults)
    if (a.scoreVersion !== '1.1.0') {
      a.score = Math.max(0, Math.min(9000000, Math.round((a.score * 9) / 1000)));
      a.scoreVersion = '1.1.0';
    }
  s.live = null;
  s.awards = [];
  s.outbox = [];
  s.challenges = {};
  s.commands = {};
  s.notifications = [];
  s.audit = [];
  s.finalStandings = [];
  delete s.attendanceSummary;
  for (const session of Object.values(s.sessions)) delete session.pending;
  for (const key of [
    'requireVerification',
    'rankedEnabled',
    'finalised',
    'playoffAt',
    'playoffLocation',
    'replyDeadline',
    'prizeInstructions',
    'instantPrizes',
    'retentionDays',
  ])
    delete s.config[key];
  s.config.releaseVersion = '1.1.0';
}
