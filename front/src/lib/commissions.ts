import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  TeacherWithBalance, TeacherBalance, TeacherCommissionRate,
  TeacherPayout, SetCommissionPayload, CreatePayoutPayload,
} from '@/types/commission';

export function useTeachersWithBalances() {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: () => apiFetch<TeacherWithBalance[]>('/commissions'),
  });
}

export function useTeacherBalance(teacherId: string) {
  return useQuery({
    queryKey: ['commissions', teacherId, 'balance'],
    queryFn: () => apiFetch<TeacherBalance>(`/commissions/${teacherId}/balance`),
    enabled: !!teacherId,
  });
}

export function useTeacherRates(teacherId: string) {
  return useQuery({
    queryKey: ['commissions', teacherId, 'rates'],
    queryFn: () => apiFetch<TeacherCommissionRate[]>(`/commissions/${teacherId}/rate`),
    enabled: !!teacherId,
  });
}

export function useTeacherPayouts(teacherId: string) {
  return useQuery({
    queryKey: ['commissions', teacherId, 'payouts'],
    queryFn: () => apiFetch<TeacherPayout[]>(`/commissions/${teacherId}/payouts`),
    enabled: !!teacherId,
  });
}

export function useSetCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetCommissionPayload) =>
      apiFetch('/commissions/rate', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commissions'] }),
  });
}

export function useCreatePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePayoutPayload) =>
      apiFetch('/commissions/payouts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commissions'] }),
  });
}
