import HostScreen from "./features/host/HostScreen.jsx";
import PlayerScreen from "./features/player/PlayerScreen.jsx";
import MonitorScreen from "./features/monitor/MonitorScreen.jsx";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const session = params.get("session");
  if (view === "mobile") return <PlayerScreen sessionId={session} />;
  if (view === "monitor") return <MonitorScreen sessionId={session} />;
  return <HostScreen />;
}
