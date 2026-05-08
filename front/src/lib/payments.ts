import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  Payment, CreatePaymentPayload, UpdatePaymentPayload,
  AllocationPreview, SchoolAccountInfo,
} from '@/types/payment';
import type { Paginated } from './lessons';

export function usePayments(filters: { teacherId?: string; from?: string; to?: string; page: number; limit: number }) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => apiFetch<Paginated<Payment>>(`/payments?${params.toString()}`),
  });
}

export function useSchoolAccount() {
  return useQuery({
    queryKey: ['payments', 'school-balance'],
    queryFn: () => apiFetch<SchoolAccountInfo>('/payments/school-balance'),
  });
}

export function usePaymentPreview(params: {
  childId: string;
  teacherId: string;
  amount: number;
  excludePaymentId?: string;
} | null) {
  const qs = params
    ? new URLSearchParams({
        childId: params.childId,
        teacherId: params.teacherId,
        amount: String(params.amount),
        ...(params.excludePaymentId ? { excludePaymentId: params.excludePaymentId } : {}),
      }).toString()
    : '';
  return useQuery({
    queryKey: ['payments', 'preview', params],
    queryFn: () => apiFetch<AllocationPreview>(`/payments/preview?${qs}`),
    enabled: !!params && params.amount > 0,
  });
}

function invalidatePaymentRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  queryClient.invalidateQueries({ queryKey: ['payments', 'school-balance'] });
  queryClient.invalidateQueries({ queryKey: ['lessons'] });
  queryClient.invalidateQueries({ queryKey: ['child-balances'] });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentPayload) =>
      apiFetch<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentPayload }) =>
      apiFetch<Payment>(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useWriteoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch(`/payments/${paymentId}/writeoff`, { method: 'POST' }),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useTopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch(`/payments/${paymentId}/topup`, { method: 'POST' }),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}
