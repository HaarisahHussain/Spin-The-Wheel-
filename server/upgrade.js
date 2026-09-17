// v1.1.0 introduced the current guest-data format. UI releases must not
// rename accounts, rescale scores or clear event history on startup.
export function upgradeGuestEvent(s) {
  if (s.schemaVersion !== 7 || s.config?.releaseVersion !== '1.1.0')
    throw Error(
      'This release supports v1.1.0 and later guest databases only. No event data was changed.',
    );
}
