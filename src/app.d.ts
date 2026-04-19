import type { SupabaseClient, Session } from '@supabase/supabase-js'

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient
			session: Session | null
			userId: string
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
