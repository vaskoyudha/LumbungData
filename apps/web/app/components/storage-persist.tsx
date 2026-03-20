"use client";

import { useEffect } from "react";

// StorageManager.persist() is a standard API but missing from some TS lib versions
interface StorageManagerWithPersist extends StorageManager {
  persist: () => Promise<boolean>;
}

export function StoragePersist() {
  useEffect(() => {
    async function requestPersistence() {
      const storage = navigator.storage as StorageManagerWithPersist | undefined;
      if (storage && typeof storage.persist === "function") {
        await storage.persist();
      }
    }
    requestPersistence();
  }, []);

  return null;
}
