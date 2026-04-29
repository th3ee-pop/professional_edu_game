# 职业教育数据驱动教学分析 H5

Next.js + Supabase classroom demo for two vocational education simulations:

- 智能制造设备故障诊断
- 护理情境流程判断

The app can run without Supabase for a local classroom rehearsal. In production, API routes write to Supabase Postgres through the Session Pooler using `pg.Pool`; the browser never receives database credentials.

## Run

```bash
npm install
npm run dev
```

Open:

- Student entry: `http://localhost:3000`
- Demo class code: `AI2026`
- Teacher login: `http://localhost:3000/teacher/login`
- Demo teacher password: `teacher-demo-2026`

## Supabase

1. Create the tables with Supabase MCP or run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env.local`.
3. Fill `SUPABASE_SESSION_POOL_URL` with the Supabase Session Pooler connection string and set `TEACHER_PASSWORD`.

Student writes and teacher reads go through Next.js route handlers. The backend uses parameterized PostgreSQL queries and a small session-pool connection pool:

```env
SUPABASE_SESSION_POOL_URL=postgresql://postgres.your-ref:password@aws-0-region.pooler.supabase.com:5432/postgres
POSTGRES_POOL_MAX=5
```

If no Postgres URL is configured, the app falls back to in-memory demo storage for local rehearsals.
