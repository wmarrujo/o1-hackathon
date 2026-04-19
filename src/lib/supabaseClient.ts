import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL

// In dev, use the local secret key so RLS is bypassed — safe because this only
// works against localhost and is dead code in production builds.
const key = import.meta.env.DEV
	? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
	: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(url, key)
