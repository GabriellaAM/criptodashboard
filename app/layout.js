import './globals.css'
import Script from 'next/script'

export const metadata = {
	title: 'Crypto Dashboard',
	description: 'Construa seu workspace de gráficos',
}

export default function RootLayout({ children }) {
	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{
					__html: `
					(function(){
					  try {
					    var ls = localStorage.getItem('dash-dark-mode');
					    var prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
					    var isDark = ls === '1' || (ls == null && prefers);
					    if (isDark) {
					      document.documentElement.classList.add('dark');
					      document.documentElement.style.backgroundColor = '#0a0a0a';
					      document.body.style.backgroundColor = '#0a0a0a';
					    }
					  } catch (e) {}
					})();
					`
				}} />
				<style dangerouslySetInnerHTML={{
					__html: `
					html { background-color: #f5f5f5; transition: background-color 0.1s; }
					html.dark { background-color: #0a0a0a; }
					body { background-color: #f5f5f5; transition: background-color 0.1s; }
					html.dark body { background-color: #0a0a0a; }
					`
				}} />
			</head>
			<body>{children}</body>
		</html>
	)
}

// Dicas de configuração:
// Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no seu ambiente.
// No Windows PowerShell, você pode rodar:
// $env:NEXT_PUBLIC_SUPABASE_URL = "https://seu-projeto.supabase.co"
// $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "sua-anon-key"
