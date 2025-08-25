"use client";

import { useEffect } from "react";

export default function DashboardsError({ error, reset }) {
  useEffect(() => {
    console.error("Erro em /dashboards:", error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-6">
      <div className="card w-full max-w-md text-center">
        <div className="text-lg font-semibold mb-2">Algo deu errado</div>
        <div className="opacity-70 text-sm mb-4">Tente novamente. Se persistir, recarregue a página.</div>
        <div className="flex justify-center gap-2">
          <button className="btn btn-primary" onClick={() => reset?.()}>Tentar novamente</button>
        </div>
      </div>
    </div>
  );
}


