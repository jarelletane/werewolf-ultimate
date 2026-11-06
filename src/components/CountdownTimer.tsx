import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

type Props = { seconds: number; label: string; paused?: boolean; onComplete?: () => void };

export function CountdownTimer({ seconds, label, paused = false, onComplete }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const deadline = useRef<number | null>(null);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setRemaining(seconds);
    setRunning(true);
    completed.current = false;
  }, [seconds, label]);

  useEffect(() => {
    if (!running || paused) {
      deadline.current = null;
      return;
    }
    deadline.current = Date.now() + remaining * 1000;
    const tick = () => {
      if (deadline.current === null) return;
      const next = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        setRunning(false);
        if (!completed.current) {
          completed.current = true;
          onCompleteRef.current?.();
        }
      }
    };
    const timer = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running, label, paused]);

  const formatted = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return (
    <div className={`timer${remaining <= 10 ? " urgent" : ""}`}>
      <div className="eyebrow">{label}</div>
      <div className="time">{formatted}</div>
      <div className="progress"><div style={{ width: `${(remaining / Math.max(1, seconds)) * 100}%` }} /></div>
      <div className="timerbuttons">
        <button onClick={() => setRunning(!running)}>
          {running ? <Pause size={15} /> : <Play size={15} />} {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => {
          completed.current = false;
          setRunning(true);
          setRemaining(seconds);
          deadline.current = Date.now() + seconds * 1000;
        }}><RotateCcw size={15} /> Reset</button>
        <button onClick={() => {
          setRemaining((current) => current + 30);
          if (deadline.current !== null) deadline.current += 30_000;
        }}>+30s</button>
      </div>
    </div>
  );
}
