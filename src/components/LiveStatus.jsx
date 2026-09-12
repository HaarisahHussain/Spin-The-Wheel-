import { useArcade, useClock } from '../state';
import { Timer } from './ui';
export function LiveStatus() {
  const { state } = useArcade();
  const now = useClock(),
    c = state.config;
  if (state.live) return <span>Live · {state.live.phase}</span>;
  if (
    c.liveAdmissionOpen === false ||
    c.finalised ||
    c.paused ||
    !c.windows.some((w) => now >= w.start && now < w.cutoff)
  )
    return <span>Live admissions closed</span>;
  if ((c.livePending || c.autoLive) && now >= c.nextLobbyAt)
    return <span>{state.active ? 'Live after this turn' : 'Live after the next solo turn'}</span>;
  if (!c.autoLive && !c.livePending) return <span>Live games announced here</span>;
  return (
    <span>
      Next live · <Timer until={c.nextLobbyAt} />
    </span>
  );
}
