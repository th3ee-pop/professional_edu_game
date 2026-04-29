import { Pool, type PoolClient } from "pg";
import { buildSummary } from "./analytics";
import { defaultClassCode } from "./scenarios";
import type { ClassSession, GameAttempt, GameId, StudentSession, Summary, TrackingEvent } from "./types";

type BatchEventInput = {
  studentSessionId: string;
  classCode: string;
  gameId?: GameId | "entry" | "teacher";
  eventType: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

type CompleteAttemptInput = {
  studentSessionId: string;
  classCode: string;
  gameId: GameId;
  score: number;
  resultLabel: string;
  startedAt?: string | null;
  answers: Record<string, unknown>;
};

type Store = {
  classSessions: ClassSession[];
  students: StudentSession[];
  events: TrackingEvent[];
  attempts: GameAttempt[];
};

type GlobalState = typeof globalThis & {
  __vetAnalyticsStore?: Store;
  __vetAnalyticsPool?: Pool;
};

const globalState = globalThis as GlobalState;
const databaseUrl = process.env.SUPABASE_SESSION_POOL_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
const usePostgres = Boolean(databaseUrl);

function getPool() {
  if (!databaseUrl) return null;
  if (!globalState.__vetAnalyticsPool) {
    globalState.__vetAnalyticsPool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.POSTGRES_POOL_MAX || 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.POSTGRES_SSL_DISABLED === "true" ? undefined : { rejectUnauthorized: false }
    });
  }
  return globalState.__vetAnalyticsPool;
}

function store(): Store {
  if (!globalState.__vetAnalyticsStore) {
    globalState.__vetAnalyticsStore = {
      classSessions: [
        {
          id: "demo-class-session",
          classCode: defaultClassCode,
          title: "人工智能与大数据技术在职业教育中的应用",
          status: "active",
          startsAt: new Date().toISOString(),
          endsAt: null
        }
      ],
      students: [],
      events: [],
      attempts: []
    };
  }
  return globalState.__vetAnalyticsStore;
}

export async function getOrCreateClassSession(classCode: string): Promise<ClassSession> {
  const normalized = normalizeClassCode(classCode);
  const pool = getPool();
  if (pool) {
    const result = await pool.query<ClassSessionRow>(
      `
      insert into public.class_sessions (class_code, title, status)
      values ($1, $2, 'active')
      on conflict (class_code) do update
        set class_code = excluded.class_code
      returning id, class_code, title, status, starts_at, ends_at
      `,
      [normalized, "人工智能与大数据技术在职业教育中的应用"]
    );
    return fromClassRow(result.rows[0]);
  }

  const state = store();
  let classSession = state.classSessions.find((item) => item.classCode === normalized);
  if (!classSession) {
    classSession = {
      id: crypto.randomUUID(),
      classCode: normalized,
      title: "人工智能与大数据技术在职业教育中的应用",
      status: "active",
      startsAt: new Date().toISOString(),
      endsAt: null
    };
    state.classSessions.push(classSession);
  }
  return classSession;
}

export async function startStudentSession(classCode: string, deviceType: string): Promise<StudentSession> {
  const classSession = await getOrCreateClassSession(classCode);
  const pool = getPool();
  if (pool) {
    const result = await pool.query<StudentSessionRow>(
      `
      insert into public.student_sessions (
        class_session_id,
        class_code,
        device_type,
        manufacturing_done,
        nursing_done
      )
      values ($1, $2, $3, false, false)
      returning id, class_session_id, class_code, device_type, started_at, completed_at, manufacturing_done, nursing_done
      `,
      [classSession.id, classSession.classCode, deviceType || "unknown"]
    );
    return fromStudentRow(result.rows[0]);
  }

  const student: StudentSession = {
    id: crypto.randomUUID(),
    classSessionId: classSession.id,
    classCode: classSession.classCode,
    deviceType: deviceType || "unknown",
    startedAt: new Date().toISOString(),
    completedAt: null,
    manufacturingDone: false,
    nursingDone: false
  };
  store().students.push(student);
  return student;
}

export async function insertEvents(inputs: BatchEventInput[]) {
  if (!inputs.length) return { inserted: 0 };

  const pool = getPool();
  if (pool) {
    const classCodeMap = new Map<string, ClassSession>();
    for (const input of inputs) {
      const code = normalizeClassCode(input.classCode);
      if (!classCodeMap.has(code)) {
        classCodeMap.set(code, await getOrCreateClassSession(code));
      }
    }

    const values: unknown[] = [];
    const tuples = inputs.map((input, index) => {
      const classSession = classCodeMap.get(normalizeClassCode(input.classCode));
      const offset = index * 7;
      values.push(
        classSession?.id,
        input.studentSessionId,
        input.gameId || null,
        input.eventType,
        input.targetId || null,
        JSON.stringify(input.payload || {}),
        input.occurredAt || new Date().toISOString()
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::jsonb, $${offset + 7}::timestamptz)`;
    });

    await pool.query(
      `
      insert into public.events (
        class_session_id,
        student_session_id,
        game_id,
        event_type,
        target_id,
        payload,
        occurred_at
      )
      values ${tuples.join(", ")}
      `,
      values
    );
    return { inserted: inputs.length };
  }

  const events: TrackingEvent[] = [];
  for (const input of inputs) {
    const classSession = await getOrCreateClassSession(input.classCode);
    events.push({
      id: crypto.randomUUID(),
      classSessionId: classSession.id,
      studentSessionId: input.studentSessionId,
      gameId: input.gameId,
      eventType: input.eventType,
      targetId: input.targetId,
      payload: input.payload || {},
      occurredAt: input.occurredAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }
  store().events.push(...events);
  return { inserted: events.length };
}

export async function completeAttempt(input: CompleteAttemptInput): Promise<GameAttempt> {
  const classSession = await getOrCreateClassSession(input.classCode);
  const pool = getPool();
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const attempt = await upsertAttempt(client, classSession.id, input);
      await client.query(
        `
        update public.student_sessions
        set
          manufacturing_done = case when $2 = 'manufacturing' then true else manufacturing_done end,
          nursing_done = case when $2 = 'nursing' then true else nursing_done end,
          completed_at = case
            when $2 = 'nursing' or (manufacturing_done = true and $2 = 'manufacturing') then coalesce(completed_at, now())
            else completed_at
          end
        where id = $1
        `,
        [input.studentSessionId, input.gameId]
      );
      await client.query("commit");
      return attempt;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  const state = store();
  const existing = state.attempts.find((attempt) => attempt.studentSessionId === input.studentSessionId && attempt.gameId === input.gameId);
  if (existing) return existing;

  const attempt: GameAttempt = {
    id: crypto.randomUUID(),
    classSessionId: classSession.id,
    studentSessionId: input.studentSessionId,
    gameId: input.gameId,
    score: input.score,
    resultLabel: input.resultLabel,
    startedAt: input.startedAt,
    completedAt: new Date().toISOString(),
    answers: input.answers
  };
  state.attempts.push(attempt);
  const student = state.students.find((item) => item.id === input.studentSessionId);
  if (student) {
    if (input.gameId === "manufacturing") student.manufacturingDone = true;
    if (input.gameId === "nursing") student.nursingDone = true;
    if (student.manufacturingDone && student.nursingDone) student.completedAt = new Date().toISOString();
  }
  return attempt;
}

export async function getTeacherSummary(classCode: string): Promise<Summary> {
  const classSession = await getOrCreateClassSession(classCode);
  const pool = getPool();
  if (pool) {
    const [students, events, attempts] = await Promise.all([
      pool.query<StudentSessionRow>(
        `
        select id, class_session_id, class_code, device_type, started_at, completed_at, manufacturing_done, nursing_done
        from public.student_sessions
        where class_session_id = $1
        order by started_at asc
        `,
        [classSession.id]
      ),
      pool.query<TrackingEventRow>(
        `
        select id, class_session_id, student_session_id, game_id, event_type, target_id, payload, occurred_at, created_at
        from public.events
        where class_session_id = $1
        order by occurred_at asc
        `,
        [classSession.id]
      ),
      pool.query<GameAttemptRow>(
        `
        select id, class_session_id, student_session_id, game_id, score, result_label, started_at, completed_at, answers
        from public.game_attempts
        where class_session_id = $1
        order by completed_at asc
        `,
        [classSession.id]
      )
    ]);
    return buildSummary(
      classSession,
      students.rows.map(fromStudentRow),
      events.rows.map(fromEventRow),
      attempts.rows.map(fromAttemptRow)
    );
  }

  const state = store();
  return buildSummary(
    classSession,
    state.students.filter((student) => student.classSessionId === classSession.id),
    state.events.filter((event) => event.classSessionId === classSession.id),
    state.attempts.filter((attempt) => attempt.classSessionId === classSession.id)
  );
}

async function upsertAttempt(client: PoolClient, classSessionId: string, input: CompleteAttemptInput) {
  const inserted = await client.query<GameAttemptRow>(
    `
    insert into public.game_attempts (
      class_session_id,
      student_session_id,
      game_id,
      score,
      result_label,
      started_at,
      answers
    )
    values ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)
    on conflict (student_session_id, game_id) do nothing
    returning id, class_session_id, student_session_id, game_id, score, result_label, started_at, completed_at, answers
    `,
    [
      classSessionId,
      input.studentSessionId,
      input.gameId,
      input.score,
      input.resultLabel,
      input.startedAt || null,
      JSON.stringify(input.answers || {})
    ]
  );
  if (inserted.rows[0]) return fromAttemptRow(inserted.rows[0]);

  const existing = await client.query<GameAttemptRow>(
    `
    select id, class_session_id, student_session_id, game_id, score, result_label, started_at, completed_at, answers
    from public.game_attempts
    where student_session_id = $1 and game_id = $2
    limit 1
    `,
    [input.studentSessionId, input.gameId]
  );
  return fromAttemptRow(existing.rows[0]);
}

function normalizeClassCode(classCode: string) {
  return (classCode || defaultClassCode).trim().toUpperCase();
}

type ClassSessionRow = {
  id: string;
  class_code: string;
  title: string;
  status: "active" | "closed";
  starts_at: string | Date;
  ends_at?: string | Date | null;
};

type StudentSessionRow = {
  id: string;
  class_session_id: string;
  class_code: string;
  device_type: string;
  started_at: string | Date;
  completed_at?: string | Date | null;
  manufacturing_done: boolean;
  nursing_done: boolean;
};

type TrackingEventRow = {
  id: string;
  class_session_id: string;
  student_session_id: string;
  game_id?: GameId | "entry" | "teacher";
  event_type: string;
  target_id?: string | null;
  payload: Record<string, unknown>;
  occurred_at: string | Date;
  created_at: string | Date;
};

type GameAttemptRow = {
  id: string;
  class_session_id: string;
  student_session_id: string;
  game_id: GameId;
  score: number;
  result_label: string;
  started_at?: string | Date | null;
  completed_at: string | Date;
  answers: Record<string, unknown>;
};

function serializeDate(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function fromClassRow(row: ClassSessionRow): ClassSession {
  return {
    id: row.id,
    classCode: row.class_code,
    title: row.title,
    status: row.status,
    startsAt: serializeDate(row.starts_at) || new Date().toISOString(),
    endsAt: serializeDate(row.ends_at)
  };
}

function fromStudentRow(row: StudentSessionRow): StudentSession {
  return {
    id: row.id,
    classSessionId: row.class_session_id,
    classCode: row.class_code,
    deviceType: row.device_type,
    startedAt: serializeDate(row.started_at) || new Date().toISOString(),
    completedAt: serializeDate(row.completed_at),
    manufacturingDone: row.manufacturing_done,
    nursingDone: row.nursing_done
  };
}

function fromEventRow(row: TrackingEventRow): TrackingEvent {
  return {
    id: row.id,
    classSessionId: row.class_session_id,
    studentSessionId: row.student_session_id,
    gameId: row.game_id,
    eventType: row.event_type,
    targetId: row.target_id || undefined,
    payload: row.payload || {},
    occurredAt: serializeDate(row.occurred_at) || new Date().toISOString(),
    createdAt: serializeDate(row.created_at) || new Date().toISOString()
  };
}

function fromAttemptRow(row: GameAttemptRow): GameAttempt {
  return {
    id: row.id,
    classSessionId: row.class_session_id,
    studentSessionId: row.student_session_id,
    gameId: row.game_id,
    score: row.score,
    resultLabel: row.result_label,
    startedAt: serializeDate(row.started_at),
    completedAt: serializeDate(row.completed_at) || new Date().toISOString(),
    answers: row.answers || {}
  };
}
