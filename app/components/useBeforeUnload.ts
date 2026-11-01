"use client";

import { useEffect } from "react";

/**
 * Meminta konfirmasi bawaan browser saat tab ditutup atau dimuat ulang
 * selama `aktif` true. Teks dialognya ditentukan browser, tidak bisa diubah.
 */
export function useBeforeUnload(aktif: boolean) {
  useEffect(() => {
    if (!aktif) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [aktif]);
}
