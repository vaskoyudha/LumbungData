"use client";

import { useEffect } from "react";

export function StoragePersist() {
  useEffect(() => {
    async function requestPersistence() {
      if (
        navigator.storage &&
        "persist" in navigator.storage
      ) {
        await (navigator.storage as any).persist();
      }
    }
    requestPersistence();
  }, []);

  return null;
}
