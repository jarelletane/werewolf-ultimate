import { useEffect, useState } from "react";

export function ServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    let registration: ServiceWorkerRegistration | undefined;
    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
      });
    };
    void navigator.serviceWorker.register("./sw.js").then((result) => {
      registration = result;
      if (result.waiting) setWaiting(result.waiting);
      watch(result.installing);
      result.addEventListener("updatefound", () => watch(result.installing));
    }).catch(() => undefined);
    const check = () => void registration?.update();
    window.addEventListener("online", check);
    return () => window.removeEventListener("online", check);
  }, []);

  if (!waiting) return null;
  return (
    <aside className="update-notice" role="status">
      <span><strong>Update ready</strong> Apply it when the current game is safely paused.</span>
      <button onClick={() => {
        waiting.postMessage({ type: "SKIP_WAITING" });
        setWaiting(null);
      }}>Apply on next launch</button>
    </aside>
  );
}
