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
  const buttonRef = useRef(null);

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
    
    return () => {
      listener.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  // Listener para fechar quando clicar fora - CORRIGIDO
  useEffect(() => {
    if (!open) return;

    console.log('🔍 UserMenu: Adicionando event listeners para dropdown aberto');

    const handleClickOutside = (e) => {
      console.log('🔍 UserMenu: Clique detectado:', e.target);
      console.log('🔍 UserMenu: menuRef.current:', menuRef.current);
      console.log('🔍 UserMenu: buttonRef.current:', buttonRef.current);
      
      // Verificar se o clique foi fora do menu E fora do botão
      if (menuRef.current && !menuRef.current.contains(e.target) && 
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        console.log('🔍 UserMenu: Fechando dropdown - clique fora detectado');
        setOpen(false);
      } else {
        console.log('🔍 UserMenu: Clique dentro do menu/botão - mantendo aberto');
      }
    };

    // Adicionar listener imediatamente
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        console.log('🔍 UserMenu: Fechando dropdown - tecla ESC pressionada');
        setOpen(false);
      }
    });

    return () => {
      console.log('🔍 UserMenu: Removendo event listeners');
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
      });
    };
  }, [open]);

  const displayName = user?.user_metadata?.full_name || user?.email || "Usuário";
  const avatarUrl = user?.user_metadata?.avatar_url || "";
  const initials = (displayName || "U").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const signOut = async () => {
    console.log('🔍 UserMenu: Função signOut chamada');
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
      <button 
        ref={buttonRef}
        type="button" 
        className="flex items-center gap-2 btn" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔍 UserMenu: Botão clicado, estado atual:', open);
          setOpen(v => {
            const newState = !v;
            console.log('🔍 UserMenu: Novo estado:', newState);
            return newState;
          });
        }}
      >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs opacity-80">{initials}</span>
          )}
        </div>
        <span className="hidden sm:inline max-w-[180px] truncate">{displayName}</span>
      </button>
      
      {/* Dropdown com posicionamento CORRIGIDO */}
      {open && (
        <div 
          data-usermenu-dropdown
          className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/60 py-2"
          style={{
            zIndex: 1000
          }}
          onClick={(e) => {
            console.log('🔍 UserMenu: Clique no dropdown detectado');
            e.stopPropagation();
          }}
        >
          <div className="px-3 py-2 text-sm opacity-70 truncate border-b border-neutral-200/50">{user.email}</div>
          <Link href="/account" className="block px-3 py-2 hover:bg-neutral-100 transition-colors" onClick={() => {
            console.log('🔍 UserMenu: Link "Minha conta" clicado');
            setOpen(false);
          }}>
            Minha conta
          </Link>
          <button className="block w-full text-left px-3 py-2 hover:bg-neutral-100 transition-colors" onClick={signOut}>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}


