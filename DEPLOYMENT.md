# Deploying Weave: Neon DB + Render Backend

Weave can be hosted entirely online as a managed cloud service using **Neon Serverless PostgreSQL** and **Render**. This eliminates the need for end users to install Node.js, pnpm, Go, Docker, or manage local backend/frontend processes.

---

## Architecture Overview

```
Browser (User)
      │
      ├─────────────────────── HTTPS ────────────────────────┐
      ▼                                                      ▼
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│ Render Frontend (Next.js 15)    │        │ Render Backend (Go Engine)       │
│ https://weave-frontend.onrender │───────▶│ https://weave-backend.onrender   │
└─────────────────────────────────┘  REST  └─────────────────┬────────────────┘
                                     + SSE                   │
                                                             │ TLS (pgxpool)
                                                             ▼
                                           ┌──────────────────────────────────┐
                                           │ Neon Serverless PostgreSQL 15+   │
                                           │ ep-xyz.us-east-2.aws.neon.tech   │
                                           └──────────────────────────────────┘
```

---

## Step 1: Create a Free Neon Database (1 Minute)

1. Go to [https://neon.tech](https://neon.tech) and sign up / log in with GitHub.
2. Click **Create Project**:
   - **Name**: `weave-db`
   - **Postgres version**: `16` (or `15`)
   - **Region**: Choose the region closest to your users (e.g. `US East (Ohio)`).
3. Once created, copy the **Connection string** from the project dashboard:
   ```text
   postgresql://alex:AbC123dEf@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   *(Keep this string handy for Step 2; Weave's built-in migration engine will automatically create all tables on first startup).*

---

## Step 2: Deploy to Render with Blueprint (1-Click)

The repository includes a `render.yaml` blueprint that deploys both the Go backend container and the Next.js visual frontend.

1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right and select **Blueprint**.
3. Connect your GitHub repository: `Senasphy/weave`.
4. Render will parse `render.yaml` and display the two services:
   - `weave-backend` (Docker Web Service running `weave all`)
   - `weave-frontend` (Node Web Service running Next.js)
5. Under `weave-backend`, paste your Neon connection string into the **`DATABASE_URL`** prompt.
6. *(Optional)* Add your default provider API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), or users can input them in the web settings.
7. Click **Apply**.

Render will now:
- Build the Go backend Docker container and start the API + Background Queue Worker on its assigned `$PORT`.
- Connect to Neon and run migrations automatically.
- Build the Next.js frontend and link its `NEXT_PUBLIC_API_URL` to the backend.

---

## Step 3: Access Your Online Workflow Service

Once the build finishes (about 2–3 minutes):
1. Click the URL for `weave-frontend` (e.g. `https://weave-frontend.onrender.com`).
2. Your visual workflow canvas, run monitor, and approval inbox are live online.
3. Every workflow run commits durable state directly to Neon PostgreSQL. If Render restarts a container or suspends an idle worker, no state or tokens are lost.

---

## Alternative: Frontend on Vercel + Backend on Render

If you prefer hosting the Next.js frontend on Vercel for instant edge delivery:

1. Deploy the backend to Render using the `Dockerfile.backend` with your Neon `DATABASE_URL`. Note your backend URL: `https://weave-backend.onrender.com`.
2. Go to [Vercel](https://vercel.com) $\rightarrow$ **Add New Project** $\rightarrow$ Import `Senasphy/weave`.
3. Set the **Root Directory** to `frontend`.
4. Add the environment variable:
   ```env
   NEXT_PUBLIC_API_URL=https://weave-backend.onrender.com
   ```
5. Click **Deploy**. Vercel will host the frontend globally with zero server configuration.

---

## Verification & Health Check

You can verify your hosted backend health at any time:
```bash
curl https://weave-backend.onrender.com/healthz
# {"status":"ok","time":"2026-10-19T09:50:00Z"}
```
