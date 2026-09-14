// Completed reviews and score breakdowns are immutable. Share those large
// values between drafts; mutable attempt metadata is still isolated.
export function cloneState(state) {
  const draft = structuredClone({ ...state, attempts: [], commands: {} });
  draft.attempts = state.attempts.map((a) => ({ ...a }));
  draft.commands = { ...state.commands };
  return draft;
}

export function freezeReviews(state) {
  const freeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  for (const a of state.attempts) {
    freeze(a.review);
    freeze(a.breakdown);
  }
}
