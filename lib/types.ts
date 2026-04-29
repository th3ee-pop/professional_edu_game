export type GameId = "manufacturing" | "nursing";

export type ClassSession = {
  id: string;
  classCode: string;
  title: string;
  status: "active" | "closed";
  startsAt: string;
  endsAt?: string | null;
};

export type StudentSession = {
  id: string;
  classSessionId: string;
  classCode: string;
  deviceType: string;
  startedAt: string;
  completedAt?: string | null;
  manufacturingDone: boolean;
  nursingDone: boolean;
};

export type TrackingEvent = {
  id: string;
  classSessionId: string;
  studentSessionId: string;
  gameId?: GameId | "entry" | "teacher";
  eventType: string;
  targetId?: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type GameAttempt = {
  id: string;
  classSessionId: string;
  studentSessionId: string;
  gameId: GameId;
  score: number;
  resultLabel: string;
  startedAt?: string | null;
  completedAt: string;
  answers: Record<string, unknown>;
};

export type Summary = {
  generatedAt: string;
  classSession: ClassSession;
  participation: {
    studentsStarted: number;
    manufacturingCompleted: number;
    nursingCompleted: number;
    bothCompleted: number;
    avgDurationSeconds: number;
  };
  bottlenecks: Array<{
    label: string;
    value: number;
    detail: string;
  }>;
  clusters: Array<{
    label: string;
    count: number;
    description: string;
  }>;
  insights: string[];
  eventCount: number;
};
