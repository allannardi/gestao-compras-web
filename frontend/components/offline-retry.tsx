"use client";

import { useEffect, useState } from "react";

export function OfflineRetry() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : false,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="offline-actions">
      <span>{online ? "A conexão voltou." : "Aguardando conexão com a internet…"}</span>
      <button type="button" onClick={() => window.location.assign("/")}>
        Tentar novamente
      </button>
    </div>
  );
}
