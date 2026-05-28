export type LessonStatus = 'PLANNED' | 'CONDUCTED' | 'CANCELLED' | 'RESCHEDULED';
export type CancellationSide = 'STUDENT' | 'TEACHER';

export interface ChildBalance {
  child: { id: string; name: string; avatar: string | null; country: string };
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

export type Subject = 'MATH' | 'UKRAINIAN';

export interface LessonNote {
  id: string;
  lessonId: string;
  description: string;
  imageData: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
}

export interface Lesson {
  id: string;
  child: LessonChild;
  teacher: LessonTeacher;
  status: LessonStatus;
  subject: Subject | null;
  startDate: string;
  endDate: string;
  price: string;
  originalStartDate: string | null;
  originalEndDate: string | null;
  note: { id: string } | null;
  cancellationSide?: CancellationSide | null;
  cancellationReason?: string | null;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonPayload {
  childId: string;
  teacherId: string;
  status?: LessonStatus;
  subject?: Subject;
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
  subject?: Subject;
  startDate?: string;
  endDate?: string;
  price?: number;
  originalStartDate?: string;
  originalEndDate?: string;
  cancellationSide?: CancellationSide;
  cancellationReason?: string;
}

export interface LessonPrice {
  id: string;
  child: LessonChild;
  teacher: LessonTeacher;
  price: string;
  subject: Subject | null;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonPricePayload {
  childId: string;
  teacherId: string;
  price: number;
  effectiveDate: string;
  subject?: Subject;
}

export interface UpdateLessonPricePayload {
  childId?: string;
  teacherId?: string;
  price?: number;
  effectiveDate?: string;
  subject?: Subject;
}
