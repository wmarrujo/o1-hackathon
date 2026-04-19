# o1 Hackathon

A SvelteKit app with Supabase as the database/auth backend.

## Prerequisites

- Node.js 18+
- Docker (required for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase`

## Local Development

### 1. Install dependencies

```sh
npm install
```

### 2. Set up environment variables

```sh
cp .env.example .env
```

### 3. Start local Supabase

Make sure Docker is running, then:

```sh
supabase start
```

This spins up a local Supabase stack and prints credentials like:

```
API URL: http://127.0.0.1:54321
anon key: <local-anon-key>
```

Update `.env` with those local values:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local-anon-key>
```

### 4. Apply migrations

```sh
supabase db reset
```

This runs all migrations in `supabase/migrations/` against your local database.

### 5. Start the dev server

```sh
npm run dev
```

The app will be at `http://localhost:5173`.

## Pulling schema changes from remote

If the remote database schema has changed:

```sh
supabase db pull
```

This generates a new migration file. Commit it and run `supabase db reset` locally to apply.

## Pushing migrations to remote

```sh
supabase db push
```

## Building for Production

```sh
npm run build
node build
```
