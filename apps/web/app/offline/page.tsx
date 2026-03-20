"use client";

import { useCallback } from "react";

export default function OfflinePage() {
  const handleReload = useCallback(() => {
    (globalThis as typeof globalThis & { location: { reload: () => void } }).location.reload();
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50">
      <div className="mx-4 max-w-md text-center">
        <div className="mb-6 text-6xl" role="img" aria-label="Tidak ada koneksi">
          🌾
        </div>
        <h1 className="text-3xl font-bold text-green-800">LumbungData</h1>
        <p className="mt-4 text-lg text-green-700">
          Anda sedang offline
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Tidak ada koneksi internet. Data yang tersimpan tetap dapat diakses.
          Hubungkan kembali ke internet untuk menyinkronkan data terbaru.
        </p>
         <button
           type="button"
           onClick={handleReload}
           className="mt-6 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800"
         >
          Coba Lagi
        </button>
      </div>
    </main>
  );
}
