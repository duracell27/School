export interface TeacherCommissionRate {
  id: string;
  percentage: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface TeacherPayout {
  id: string;
  teacherId: string;
  amount: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  admin: { id: string; name: string };
}

export interface TeacherBalance {
  officialEarnings: number;
  potentialEarnings: number;
  totalPayout: number;
  balance: number;
  potentialBalance: number;
  currentCommission: number | null;
  totalRevenue: number;
  schoolRevenue: number;
  conductedLessonsCount: number;
}

export interface TeacherWithBalance {
  id: string;
  name: string;
  avatar: string | null;
  status: string;
  balance: TeacherBalance;
}

export interface SetCommissionPayload {
  teacherId: string;
  percentage: string;
  effectiveFrom: string;
}

export interface CreatePayoutPayload {
  teacherId: string;
  amount: string;
  notes?: string;
  paidAt?: string;
}

export interface UpdatePayoutPayload {
  amount?: string;
  notes?: string;
  paidAt?: string;
}
