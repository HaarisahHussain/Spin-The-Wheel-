// Own every delayed operation so reset/disposal can cancel the entire lifecycle.
export function schedule(session, callback, delay) {
  const timer = setTimeout(() => {
    session.timers.delete(timer);
    callback();
  }, delay);
  session.timers.add(timer);
  return timer;
}

export function clearTimers(session) {
  for (const timer of session.timers) clearTimeout(timer);
  session.timers.clear();
  session.gameTimer = null;
}
