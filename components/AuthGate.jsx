"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthGate({ children }) {
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(null);
	const [mode, setMode] = useState("signin"); // signin | signup
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");

	useEffect(() => {
		let mounted = true;
		const init = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!mounted) return;
			setUser(user || null);
			setLoading(false);
		};
		init();
		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			const u = session?.user || null;
			setUser(u);
		});
		return () => {
			mounted = false;
			listener.subscription.unsubscribe();
		};
	}, []);

	const validateEmail = (value) => /.+@.+\..+/.test(value);

	const handleSignIn = async (e) => {
		e.preventDefault();
		setError("");
		setInfo("");
		const emailTrim = (email || "").trim();
		if (!validateEmail(emailTrim)) return setError("Informe um email válido.");
		if (!password) return setError("Informe a senha.");
		setSubmitting(true);
		const { error } = await supabase.auth.signInWithPassword({ email: emailTrim, password });
		if (error) setError(error.message || "Falha no login");
		setSubmitting(false);
	};

	const handleSignUp = async (e) => {
		e.preventDefault();
		setError("");
		setInfo("");
		const emailTrim = (email || "").trim();
		if (!validateEmail(emailTrim)) return setError("Informe um email válido.");
		if ((password || "").length < 6) return setError("A senha deve ter ao menos 6 caracteres.");
		if (password !== passwordConfirm) return setError("As senhas não coincidem.");
		setSubmitting(true);
		const { data, error } = await supabase.auth.signUp({ email: emailTrim, password });
		if (error) setError(error.message || "Falha no cadastro");
		else {
			// Se o projeto exige confirmação por email, não haverá sessão imediatamente
			if (!data.session) setInfo("Enviamos um email de confirmação. Verifique sua caixa de entrada.");
			else setInfo("Cadastro realizado com sucesso!");
		}
		setSubmitting(false);
	};

	const handleForgot = async () => {
		setError("");
		setInfo("");
		const emailTrim = (email || "").trim();
		if (!validateEmail(emailTrim)) return setError("Informe um email válido para recuperar a senha.");
		setSubmitting(true);
		try {
			const redirectTo = typeof window !== "undefined" ? `${window.location.origin}` : undefined;
			const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, { redirectTo });
			if (error) setError(error.message || "Não foi possível enviar o email de recuperação.");
			else setInfo("Se o email existir, enviamos instruções para redefinir a senha.");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) return (
		<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
			<div className="flex flex-col items-center gap-3">
				<div className="w-10 h-10 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 animate-spin" />
				<div className="text-sm opacity-70">Carregando...</div>
			</div>
		</div>
	);
	if (user) return <>{children}</>;

	return (
		<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
			<div className="w-full max-w-md p-6 border rounded-xl bg-white/70 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700">
				<div className="flex items-center gap-2 mb-4">
					<button
						type="button"
						className={`btn ${mode === "signin" ? "btn-primary" : ""}`}
						onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
					>
						Entrar
					</button>
					<button
						type="button"
						className={`btn ${mode === "signup" ? "btn-primary" : ""}`}
						onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
					>
						Criar conta
					</button>
				</div>

				{error && <div className="mb-3 text-sm text-red-600">{error}</div>}
				{info && <div className="mb-3 text-sm text-green-700 dark:text-green-300">{info}</div>}

				<form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
					<label className="block text-sm mb-1">Email</label>
					<input
						className="w-full rounded-xl border px-3 py-2 mb-3 bg-transparent"
						type="email"
						value={email}
						onChange={(e)=>setEmail(e.target.value)}
						required
					/>

					<label className="block text-sm mb-1">Senha</label>
					<input
						className="w-full rounded-xl border px-3 py-2 mb-3 bg-transparent"
						type="password"
						value={password}
						onChange={(e)=>setPassword(e.target.value)}
						required
					/>

					{mode === "signup" && (
						<>
							<label className="block text-sm mb-1">Confirmar senha</label>
							<input
								className="w-full rounded-xl border px-3 py-2 mb-4 bg-transparent"
								type="password"
								value={passwordConfirm}
								onChange={(e)=>setPasswordConfirm(e.target.value)}
								required
							/>
						</>
					)}

					<button type="submit" className="btn btn-primary w-full mb-2" disabled={submitting}>
						{submitting ? (mode === "signin" ? "Entrando..." : "Criando...") : (mode === "signin" ? "Entrar" : "Criar conta")}
					</button>
				</form>

				{mode === "signin" && (
					<button type="button" className="btn w-full" onClick={handleForgot} disabled={submitting}>
						Esqueci minha senha
					</button>
				)}
			</div>
		</div>
	);
}
