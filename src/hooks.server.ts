import { createServerClient } from '@supabase/ssr'
import { redirect } from '@sveltejs/kit'
import type { Handle } from '@sveltejs/kit'

const PUBLIC_ROUTES = new Set(['/', '/login'])

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url

	event.locals.supabase = createServerClient(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) =>
						event.cookies.set(name, value, { ...options, path: '/' })
					)
				}
			}
		}
	)

	// API routes: validate Bearer token
	const isApiRoute = pathname.endsWith('/api') || pathname.startsWith('/api/')
	if (isApiRoute) {
		const authHeader = event.request.headers.get('authorization')
		const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

		if (!token) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		}

		const { data: { user }, error } = await event.locals.supabase.auth.getUser(token)
		if (error || !user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		}

		event.locals.userId = user.id
		event.locals.session = null
		return resolve(event)
	}

	// Page routes: check session from cookies
	const { data: { session } } = await event.locals.supabase.auth.getSession()
	event.locals.session = session
	if (session) event.locals.userId = session.user.id

	if (!PUBLIC_ROUTES.has(pathname) && !session) {
		redirect(303, '/login')
	}

	return resolve(event)
}
