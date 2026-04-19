import type { Handle } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'

const PROTECTED_PREFIXES = ['/api/', '/speech-to-text/api', '/checkout/api']

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url
	const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

	if (!isProtected) return resolve(event)

	const authHeader = event.request.headers.get('authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

	if (!token) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const supabase = createClient(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
	)

	const {
		data: { user },
		error
	} = await supabase.auth.getUser(token)

	if (error || !user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	event.locals.userId = user.id
	return resolve(event)
}
