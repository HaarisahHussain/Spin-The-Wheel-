import { SCORING_VERSION } from '../shared/catalog.js';
// Preserve identities and historical attempts; never merge competitive versions.
export function migrateState(s, now) {
  if (s.config.releaseVersion === '0.4.0') return;
  Object.assign(s.config, {
    releaseVersion: '0.4.0',
    lobbySeconds: 20,
    liveTimeScale: 1,
    idlePresentation: 'both',
    animateIdleWheel: true,
    livePending: false,
    interval: Math.max(180, Math.min(900, s.config.interval || 300)),
    rankedEnabled: false,
    scoringVersion: SCORING_VERSION,
  });
  s.config.policyVersion++;
  s.config.nextLobbyAt = now + s.config.interval * 1000;
  if (s.active?.phase !== 'playing') s.active = null;
  s.live = null;
}
