export type PaymentLessonType = 'DEBT' | 'PREPAID';
export type SchoolTransactionReason = 'OVERPAYMENT_WRITEOFF' | 'UNDERPAYMENT_TOPUP';

export interface PaymentLessonSummary {
  lessonId: string;
  amount: string;
  type: PaymentLessonType;
}

export interface Payment {
  id: string;
  child: { id: string; name: string; avatar: string | null };
  teacher: { id: string; name: string; avatar: string | null };
  amount: string;
  date: string;
  notes: string | null;
  createdBy: { id: string; name: string };
  lessons: PaymentLessonSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPayload {
  childId: string;
  teacherId: string;
  amount: string;
  date: string;
  notes?: string;
}

export interface UpdatePaymentPayload {
  amount?: string;
  date?: string;
  notes?: string;
}

export interface AllocationPreview {
  debtLessons: number;
  prepaidLessons: number;
  paymentLeftover: number;
  nextLessonShortfall: number;
  schoolBalance: number;
  virtualPrepaidLessons: number;
  lessonPrice: number | null;
}

export interface SchoolTransaction {
  id: string;
  amount: string;
  reason: SchoolTransactionReason;
  note: string | null;
  admin: { id: string; name: string };
  createdAt: string;
}

export interface SchoolAccountInfo {
  balance: number;
  transactions: SchoolTransaction[];
}
