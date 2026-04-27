import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  Payment, CreatePaymentPayload, UpdatePaymentPayload,
  AllocationPreview, SchoolAccountInfo,
} from '@/types/payment';

export function usePayments(filters: { teacherId?: string; from?: string; to?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => apiFetch<Payment[]>(`/payments${qs ? `?${qs}` : ''}`),
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

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentPayload) =>
      apiFetch<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentPayload }) =>
      apiFetch<Payment>(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useWriteoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch(`/payments/${paymentId}/writeoff`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
}

export function useTopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch(`/payments/${paymentId}/topup`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
}
