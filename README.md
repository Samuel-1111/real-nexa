# REAL NEXA

NEXA is a premium personal assistant web app built from the supplied NEXA UI reference.

## Stack
Next.js 16 + React + TypeScript, Supabase Auth/Postgres/RLS/Edge Functions, OpenAI.

## Required client environment
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- NEXT_PUBLIC_APP_URL

## Required Supabase secrets
- OPENAI_API_KEY
- payment provider secrets when billing is enabled

Never expose secret/service keys in browser code.

## Development
npm install
npm run dev

## Checks
npm run typecheck
npm run build
