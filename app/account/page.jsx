"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AuthGate from "../../components/AuthGate";

export default function AccountPage() {
  return (
    <AuthGate>
      <AccountInner />
    </AuthGate>
  );
}

function AccountInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
      if (user) {
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      }
      setLoading(false);
    };
    init();
  }, []);

  const saveProfile = async () => {
    setErr("");
    setMsg("");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, avatar_url: avatarUrl } });
    if (error) setErr(error.message || "Erro ao salvar perfil");
    else setMsg("Perfil atualizado!");
    setSaving(false);
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setErr(""); setMsg(""); setSaving(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data?.publicUrl || "";
      setAvatarUrl(publicUrl);
      const { error: upUserErr } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (upUserErr) throw upUserErr;
      setMsg("Foto atualizada!");
    } catch (e) {
      setErr(e?.message || "Erro ao enviar avatar. Verifique o bucket 'avatars'.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setErr(""); setMsg("");
    if ((newPassword || "").length < 6) return setErr("A nova senha deve ter ao menos 6 caracteres.");
    if (newPassword !== confirmPassword) return setErr("As senhas não coincidem.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setErr(error.message || "Erro ao trocar a senha");
    else setMsg("Senha atualizada com sucesso.");
    setSaving(false);
    setNewPassword(""); setConfirmPassword("");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 animate-spin" />
        <div className="text-sm opacity-70">Carregando conta...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="sticky top-0 z-10 border-b bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-2">
          <Link href="/" className="btn">← Voltar</Link>
          <h1 className="text-lg sm:text-xl font-semibold">Minha conta</h1>
          <div className="ml-auto">
            <button className="btn" onClick={signOut}>Sair</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 grid gap-6">
        {(err || msg) && (
          <div className={`p-3 rounded-lg text-sm ${err ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'}`}>
            {err || msg}
          </div>
        )}

        <div className="card">
          <div className="text-lg font-semibold mb-3">Perfil</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Email</label>
              <input className="w-full rounded-xl border px-3 py-2 mb-3 bg-transparent" value={email} disabled />
              <label className="block text-sm mb-1">Nome</label>
              <input className="w-full rounded-xl border px-3 py-2 mb-3 bg-transparent" value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Seu nome" />
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>Salvar perfil</button>
            </div>
            <div>
              <div className="text-sm mb-2">Foto de perfil</div>
              <div className="w-28 h-28 rounded-full overflow-hidden border mb-2 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="opacity-60 text-xs p-2 text-center">Sem foto</div>
                )}
              </div>
              <label className="btn cursor-pointer">
                Trocar foto
                <input hidden type="file" accept="image/*" onChange={onAvatarChange} />
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="text-lg font-semibold mb-3">Segurança</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nova senha</label>
              <input className="w-full rounded-xl border px-3 py-2 mb-3 bg-transparent" type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirmar nova senha</label>
              <input className="w-full rounded-xl border px-3 py-2 mb-3 bg-transparent" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="••••••" />
            </div>
          </div>
          <button className="btn btn-primary" onClick={changePassword} disabled={saving}>Atualizar senha</button>
        </div>
      </div>
    </div>
  );
}


