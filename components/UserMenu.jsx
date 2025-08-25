"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(user || null);
      setLoading(false);
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user || null);
    });
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => {
      listener.subscription.unsubscribe();
      document.removeEventListener("click", onDocClick);
      mounted = false;
    };
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email || "Usuário";
  const avatarUrl = user?.user_metadata?.avatar_url || "";
  const initials = (displayName || "U").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/");
  };

  if (loading) return null;
  if (!user) return (
    <Link href="/" className="btn">Entrar</Link>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button type="button" className="flex items-center gap-2 btn" onClick={() => setOpen((v) => !v)}>
        <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs opacity-80">{initials}</span>
          )}
        </div>
        <span className="hidden sm:inline max-w-[180px] truncate">{displayName}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 card shadow-lg">
          <div className="px-3 py-2 text-sm opacity-70 truncate">{user.email}</div>
          <div className="border-t border-neutral-200 dark:border-neutral-800" />
          <Link href="/account" className="block px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setOpen(false)}>
            Minha conta
          </Link>
          <button className="block w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={signOut}>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}


