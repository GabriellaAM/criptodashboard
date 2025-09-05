import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient

if (!supabaseUrl || !supabaseKey) {
	console.warn('⚠️ Supabase env vars ausentes: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
	// Fallback seguro para evitar que o app quebre enquanto as envs não estão configuradas
	supabaseClient = {
		auth: {
			getUser: async () => {
				console.log('🔒 Supabase fallback: getUser retornando null');
				return { data: { user: null } };
			},
			signInWithPassword: async () => ({ error: { message: 'Supabase não configurado' } }),
			signUp: async () => ({ error: { message: 'Supabase não configurado' } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
		},
		channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe() {} }) }), subscribe: () => ({ unsubscribe() {} }) }),
		from: () => ({
			upsert: async () => {
				console.log('💾 Supabase fallback: upsert simulado');
				return { error: { message: 'Supabase não configurado' } };
			},
			select: async () => {
				console.log('📖 Supabase fallback: select retornando null');
				return { data: null, error: null };
			},
			update: async () => {
				console.log('✏️ Supabase fallback: update simulado');
				return { error: { message: 'Supabase não configurado' } };
			},
			insert: async () => {
				console.log('➕ Supabase fallback: insert simulado');
				return { error: { message: 'Supabase não configurado' } };
			},
			delete: async () => {
				console.log('🗑️ Supabase fallback: delete simulado');
				return { error: { message: 'Supabase não configurado' } };
			},
			eq: function() { return this; },
			single: function() { return this; },
			order: function() { return this; }
		})
	}
} else {
	console.log('✅ Supabase cliente criado com sucesso');
	supabaseClient = createClient(supabaseUrl, supabaseKey)
}

export const supabase = supabaseClient
