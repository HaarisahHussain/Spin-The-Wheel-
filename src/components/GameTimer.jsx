import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

export default function GameTimer({
  seconds = 25,
  startedAt,
  deadlineAt,
  variant = "phone",
}) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const deadline =
    deadlineAt ?? (startedAt ? startedAt + seconds * 1000 : null);
  const remaining = deadline ? Math.max(0, (deadline - now) / 1000) : seconds;

  return (
    <div
      className={`${variant === "phone" ? "game-timer" : "timer-pill"} ${remaining <= 5 ? "timer-danger" : ""}`}
    >
      <Clock3 size={variant === "phone" ? 15 : 18} />
      {Math.ceil(remaining)}s
    </div>
  );
}
