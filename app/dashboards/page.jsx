"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UserMenu from "../../components/UserMenu";
import { useRouter } from "next/navigation";
import AuthGate from "../../components/AuthGate";
import { listOwnedDashboards, listMemberDashboards, createDashboard, renameDashboard, deleteDashboardById } from "../../lib/dashboard-persistence";

function PageInner() {
  const router = useRouter();
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [delState, setDelState] = useState({ open: false, id: null, name: "" });
  const [renameState, setRenameState] = useState({ open: false, id: null, name: "" });

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [o, s] = await Promise.all([listOwnedDashboards(), listMemberDashboards()]);
      setOwned(o || []);
      setShared(s || []);
    } catch (e) {
      setError("Erro ao carregar dashboards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onCreate = async () => {
    setCreating(true);
    const { data, error } = await createDashboard("Dashboard", []);
    setCreating(false);
    if (error) { setError(error.message || "Erro ao criar dashboard"); return; }
    await refresh();
    if (data?.id) setRenameState({ open: true, id: data.id, name: "" });
  };

  const onSaveCurrent = async () => {
    try {
      setError(""); setInfo("");
      const raw = localStorage.getItem("econ-crypto-dashboard-v1");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("Não há dashboard atual salvo localmente.");
        return;
      }
      const { data, error } = await createDashboard("Migrado do local", parsed);
      if (error) { setError(error.message || "Erro ao salvar atual"); return; }
      setInfo("Dashboard atual salvo no Supabase.");
      await refresh();
      if (data?.id) router.push(`/?d=${data.id}`);
    } catch {
      setError("Falha ao ler estado local.");
    }
  };

  const onRename = async (id, name) => {
    if (!name?.trim()) return;
    await renameDashboard(id, name.trim());
    await refresh();
  };

  const onDelete = (id, name) => {
    setDelState({ open: true, id, name: name || "" });
  };
  const confirmDelete = async () => {
    const id = delState.id;
    setDelState({ open: false, id: null, name: "" });
    if (!id) return;
    await deleteDashboardById(id);
    await refresh();
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="sticky top-0 z-10 border-b bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-2">
          <Link href="/" className="btn">← Voltar</Link>
          <h1 className="text-lg sm:text-xl font-semibold">Meus dashboards</h1>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-primary" onClick={onCreate} disabled={creating}>{creating ? "Criando..." : "Novo"}</button>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 grid gap-6">
        {error && <div className="text-sm p-3 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">{error}</div>}
        {info && <div className="text-sm p-3 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">{info}</div>}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">Meus</h2>
          </div>
          {loading ? (
            <div className="opacity-70 text-sm">Carregando...</div>
          ) : owned.length === 0 ? (
            <div className="opacity-70 text-sm flex items-center gap-2">
              <span>Nenhum dashboard.</span>
              <button className="btn" onClick={onCreate}>Criar novo</button>
              <button className="btn" onClick={onSaveCurrent}>Salvar o atual</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {owned.map(d => (
                <div key={d.id} className="card flex flex-col gap-2">
                  <input
                    className="w-full rounded-xl border px-3 py-2 bg-transparent text-sm"
                    defaultValue={d.name}
                    onBlur={(e)=>onRename(d.id, e.target.value)}
                  />
                  <div className="text-xs opacity-70">Atualizado em {new Date(d.updated_at).toLocaleString()}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn btn-primary" onClick={()=>router.push(`/?d=${d.id}`)}>Abrir</button>
                    <button className="btn" onClick={()=>onDelete(d.id, d.name)}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">Compartilhados comigo</h2>
          </div>
          {loading ? (
            <div className="opacity-70 text-sm">Carregando...</div>
          ) : shared.length === 0 ? (
            <div className="opacity-70 text-sm">Nenhum dashboard compartilhado.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shared.map(d => (
                <div key={d.id} className="card flex flex-col gap-2">
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs opacity-70">Atualizado em {new Date(d.updated_at).toLocaleString()}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn btn-primary" onClick={()=>router.push(`/?d=${d.id}`)}>Abrir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {delState.open && (
        <div className="modal" onClick={()=>setDelState({ open:false, id:null, name:"" })}>
          <div className="card w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Excluir dashboard</div>
            <div className="opacity-80 text-sm">Tem certeza que deseja excluir "{delState.name || 'este dashboard'}"? Esta ação não pode ser desfeita.</div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={()=>setDelState({ open:false, id:null, name:"" })}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {renameState.open && (
        <div className="modal" onClick={()=>setRenameState({ open:false, id:null, name:"" })}>
          <div className="card w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Nome do novo dashboard</div>
            <input
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              placeholder="Digite um nome"
              value={renameState.name}
              onChange={(e)=>setRenameState(s=>({...s, name: e.target.value}))}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={()=>setRenameState({ open:false, id:null, name:"" })}>Cancelar</button>
              <button className="btn btn-primary" onClick={async()=>{ await onRename(renameState.id, renameState.name || 'Meu dashboard'); setRenameState({ open:false, id:null, name:"" }); }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardsPage() {
  return (
    <AuthGate>
      <PageInner />
    </AuthGate>
  );
}


