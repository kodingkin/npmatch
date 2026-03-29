"use client";
import { useEffect, useState } from "react";

export function useHealthCheck(intervalMs = 60000) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        setOk(res.ok);
      } catch {
        setOk(false);
      }
    };

    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return ok;
}