"use client";

import { useEffect, useState } from "react";
import { addMemberByEmail, listMembers, removeMember, togglePublic } from "../lib/dashboard-persistence";

export default function ShareModal({ dashboardId, isPublic, publicSlug, onClose, onChanged }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [publicOn, setPublicOn] = useState(!!isPublic);
  const [slug, setSlug] = useState(publicSlug || null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const list = await listMembers(dashboardId);
      setMembers(list);
      setLoading(false);
    };
    init();
  }, [dashboardId]);

  const invite = async () => {
    setError(""); setInfo("");
    if (!email) return;
    const { error } = await addMemberByEmail(dashboardId, email, role);
    if (error) setError(error);
    else {
      setInfo("Convite adicionado.");
      setEmail("");
      const list = await listMembers(dashboardId);
      setMembers(list);
      onChanged?.();
    }
  };

  const remove = async (userId) => {
    await removeMember(dashboardId, userId);
    const list = await listMembers(dashboardId);
    setMembers(list);
    onChanged?.();
  };

  const toggle = async () => {
    const makePublic = !publicOn;
    const { error } = await togglePublic(dashboardId, makePublic);
    if (!error) {
      setPublicOn(makePublic);
      // refresh UI consumer if needed
      onChanged?.();
    }
  };

  const publicUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?p=${slug}` : '';

  return (
    <div className="modal modal-lg" onClick={onClose}>
      <div className="modal-card w-full" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Compartilhar dashboard</h2>
        </div>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        {info && <div className="mb-3 text-sm text-green-700 dark:text-green-300">{info}</div>}

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Link público</div>
              <div className="text-xs opacity-70">Qualquer pessoa com o link pode visualizar</div>
            </div>
            <button className={`btn ${publicOn ? 'btn-primary' : ''}`} onClick={toggle}>
              {publicOn ? 'Ativado' : 'Ativar'}
            </button>
          </div>
          {publicOn && slug && (
            <div className="mt-2 text-xs break-all p-2 rounded bg-neutral-100 dark:bg-neutral-800">{publicUrl}</div>
          )}
        </div>

        <div className="mb-4">
          <div className="font-medium mb-2">Convidar por email</div>
          <div className="flex gap-2">
            <input className="flex-1 rounded-xl border px-3 py-2 bg-transparent" placeholder="email@exemplo.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <select className="rounded-xl border px-3 py-2 bg-transparent" value={role} onChange={(e)=>setRole(e.target.value)}>
              <option value="viewer">Visualizador</option>
              <option value="editor">Editor</option>
            </select>
            <button className="btn btn-primary" onClick={invite}>Convidar</button>
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">Membros</div>
          {loading ? (
            <div className="text-sm opacity-70">Carregando...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Usuário</th>
                    <th className="text-left p-2 border-b">Papel</th>
                    <th className="text-left p-2 border-b">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(members || []).map((m)=> (
                    <tr key={m.user_id} className="odd:bg-neutral-50/60 dark:odd:bg-neutral-900/50">
                      <td className="p-2 border-b">{m?.profiles?.full_name || m?.profiles?.email || m.user_id}</td>
                      <td className="p-2 border-b">{m.role}</td>
                      <td className="p-2 border-b">
                        <button className="btn" onClick={()=>remove(m.user_id)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}


