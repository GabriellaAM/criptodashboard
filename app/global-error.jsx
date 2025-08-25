"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-6">
          <div className="card w-full max-w-md text-center">
            <div className="text-lg font-semibold mb-2">Erro inesperado</div>
            <div className="opacity-70 text-sm mb-4">{error?.message || "Ocorreu um erro."}</div>
            <div className="flex justify-center gap-2">
              <button className="btn btn-primary" onClick={() => reset?.()}>Recarregar</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}


