import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient

if (!supabaseUrl || !supabaseKey) {
	console.warn('Supabase env vars ausentes: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
	// Fallback seguro para evitar que o app quebre enquanto as envs não estão configuradas
	supabaseClient = {
		auth: {
			getUser: async () => ({ data: { user: null } }),
			signInWithPassword: async () => ({ error: { message: 'Supabase não configurado' } }),
			signUp: async () => ({ error: { message: 'Supabase não configurado' } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
		},
		channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe() {} }) }), subscribe: () => ({ unsubscribe() {} }) }),
		from: () => ({
			upsert: async () => ({ error: { message: 'Supabase não configurado' } }),
			select: async () => ({ error: { message: 'Supabase não configurado' } }),
			update: async () => ({ error: { message: 'Supabase não configurado' } }),
		})
	}
} else {
	supabaseClient = createClient(supabaseUrl, supabaseKey)
}

export const supabase = supabaseClient
