export type Period = 'week' | 'month' | 'year';

export interface DashboardSummary {
  earned: number;
  expected: number;
  earnedDelta: number | null;
}

export interface ChartPoint {
  label: string;
  conducted: number;
  cancelled: number;
  planned: number;
  rescheduled: number;
}

export interface NextLesson {
  id: string;
  startDate: string;
  endDate: string;
  child: { id: string; name: string; avatar: string | null };
  teacher: { id: string; name: string };
}

export interface ChildrenStats {
  active: number;
  newThisMonth: number;
  byCountry: { country: string; count: number }[];
}

export interface TeacherRow {
  id: string;
  name: string;
  avatar: string | null;
  lessonsCount: number;
  earned: number;
  expected: number;
  childrenCount: number;
}
