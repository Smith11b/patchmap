# PatchMap

PatchMap is a Next.js app for turning pull requests into grouped review walkthroughs. This repo now supports a full local workflow backed by a local Supabase stack, so you can run it inside a work network without depending on the hosted database.

## Local Quick Start

Prerequisites:

- Node.js 20+
- Docker Desktop (required by local Supabase)
- Supabase CLI available through `npx supabase`

First-time setup:

```bash
npm install
npm run local:setup
```

Daily start:

```bash
npm run local:start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000), create an account, and PatchMap will create your default workspace after sign-in.

If you prefer Explorer instead of the terminal on Windows, you can double-click:

- `PatchMap Local Setup.cmd`
- `PatchMap Local Start.cmd`

## What Runs Locally

- Next.js runs on `http://127.0.0.1:3000`
- Supabase API runs on `http://127.0.0.1:54321`
- Supabase Studio runs on `http://127.0.0.1:54323`
- Auth and application data stay in the local Supabase instance

`npm run local:setup` will:

1. Start the local Supabase services.
2. Apply the repo migrations to a fresh local database.
3. Generate a local `.env.local` with the Supabase URL, anon key, service role key, and a credential encryption key.
4. Preserve any existing provider-related settings when possible.

## Provider Imports Inside A WAF

PatchMap itself can now run fully local, but PR import still depends on whichever source system you use:

- GitLab imports need `GITLAB_BASE_URL`, plus either a saved token in Settings or `GITLAB_TOKEN` in `.env.local`.
- GitHub imports need a saved token in Settings or `GITHUB_TOKEN` in `.env.local`.
- GitHub App setup is optional for local use. Leave the GitHub App variables blank unless you explicitly want that flow.

That means the app can stay local while still reaching internal GitLab or GitHub Enterprise endpoints available from your work network.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run local:setup
npm run local:start
```
