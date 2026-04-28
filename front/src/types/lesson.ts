export type LessonStatus = 'PLANNED' | 'CONDUCTED' | 'CANCELLED' | 'RESCHEDULED';

export interface ChildBalance {
  child: { id: string; name: string; avatar: string | null };
  teacher: { id: string; name: string; avatar: string | null };
  debtCount: number;
  debtUah: number;
  prepaidCount: number;
  leftoverUah: number;
}
export type PaymentStatus = 'PAID' | 'UNPAID' | 'PREPAID' | null;

export interface LessonChild {
  id: string;
  name: string;
  avatar: string | null;
  timezone: string;
  country: string;
}

export interface LessonTeacher {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Lesson {
  id: string;
  child: LessonChild;
  teacher: LessonTeacher;
  status: LessonStatus;
  startDate: string;
  endDate: string;
  price: string;
  originalStartDate: string | null;
  originalEndDate: string | null;
  paymentStatus?: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonPayload {
  childId: string;
  teacherId: string;
  status?: LessonStatus;
  startDate: string;
  endDate: string;
  price: number;
  originalStartDate?: string;
  originalEndDate?: string;
}

export interface UpdateLessonPayload {
  childId?: string;
  teacherId?: string;
  status?: LessonStatus;
  startDate?: string;
  endDate?: string;
  price?: number;
  originalStartDate?: string;
  originalEndDate?: string;
}

export interface LessonPrice {
  id: string;
  child: LessonChild;
  teacher: LessonTeacher;
  price: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonPricePayload {
  childId: string;
  teacherId: string;
  price: number;
  effectiveDate: string;
}

export interface UpdateLessonPricePayload {
  childId?: string;
  teacherId?: string;
  price?: number;
  effectiveDate?: string;
}
