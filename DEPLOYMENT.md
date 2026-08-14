# Deploying AI Study Assistant (100% free stack)

- **Database** → Supabase (free Postgres)
- **File storage** → Cloudflare R2 (free, 10GB, no egress fees)
- **LLM** → Gemini (free tier, replaces Ollama for the live deployed version)
- **Backend** → Fly.io (free tier, includes persistent disk for ChromaDB)
- **Frontend** → Vercel (free)

Your local dev setup (Ollama + Docker Compose) doesn't change at all — this is only
for the deployed/live version.

---

## 1. Supabase (database)

1. Go to [supabase.com](https://supabase.com), create a free account and a new project.
2. In the project dashboard → **Settings → Database**, copy the **Connection string**
   (URI format). It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
   This becomes your `DATABASE_URL` for deployment.

## 2. Cloudflare R2 (file storage)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** in the sidebar,
   create a free account if needed.
2. Create a bucket, name it `documents`.
3. Go to **Manage R2 API Tokens** → create a token with **Object Read & Write** permission.
   Copy the **Access Key ID**, **Secret Access Key**, and your **Account ID** (shown on
   the R2 overview page).
4. These map to:
   ```
   STORAGE_BACKEND=r2
   R2_ACCOUNT_ID=<your account id>
   R2_ACCESS_KEY_ID=<access key id>
   R2_SECRET_ACCESS_KEY=<secret access key>
   R2_BUCKET=documents
   ```

## 3. Gemini (LLM)

1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API key** → create one.
2. This maps to:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=<your key>
   ```

## 4. Fly.io (backend)

1. Install the Fly CLI: see [fly.io/docs/flyctl/install](https://fly.io/docs/flyctl/install/)
2. From the `backend/` folder:
   ```bash
   fly auth login
   fly launch
   ```
   It'll detect the `Dockerfile` and `fly.toml` already in this folder. Say **no** when
   asked to create a new Postgres/Redis (you're using Supabase). Say **yes** to creating
   the volume for `chroma_data` if prompted.
3. Set your environment variables as Fly secrets (these override `.env` — don't commit
   real secrets to git):
   ```bash
   fly secrets set \
     SECRET_KEY="a-long-random-string" \
     DATABASE_URL="postgresql://...supabase-connection-string..." \
     FRONTEND_ORIGIN="https://your-app.vercel.app" \
     LLM_PROVIDER="gemini" \
     GEMINI_API_KEY="..." \
     STORAGE_BACKEND="r2" \
     R2_ACCOUNT_ID="..." \
     R2_ACCESS_KEY_ID="..." \
     R2_SECRET_ACCESS_KEY="..." \
     R2_BUCKET="documents"
   ```
4. Deploy:
   ```bash
   fly deploy
   ```
5. Your backend is now live at `https://ai-study-assistant-backend.fly.dev` (or whatever
   name you picked). Test it: `https://your-app.fly.dev/health`

## 5. Vercel (frontend)

1. Push your code to a GitHub repo if you haven't already.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
3. Set the **Root Directory** to `frontend`.
4. Add an environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend.fly.dev/api/v1
   ```
5. Deploy. Vercel picks up `vercel.json` automatically for routing.

## 6. Final check

- Visit your Vercel URL, sign up, create a course, upload a document.
- If uploads fail, check Fly.io logs: `fly logs`
- If the LLM features fail, double check `GEMINI_API_KEY` is set correctly as a Fly secret.

## Notes

- **First request may be slow.** Fly's free tier stops the machine when idle
  (`auto_stop_machines`) and restarts it on the next request — expect ~10-20s on a cold start.
- **Don't mix embeddings between providers.** Your local dev ChromaDB (embedded via Ollama)
  and your deployed ChromaDB (embedded via Gemini) are separate volumes, so this isn't an
  issue in practice — just don't manually copy data between them.
- **Password reset emails still aren't wired up** (see main README) — that's a separate
  piece of work (e.g. Resend) if you want it before sharing this publicly.