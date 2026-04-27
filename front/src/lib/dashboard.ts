import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  DashboardSummary, ChartPoint, NextLesson, ChildrenStats, TeacherRow, Period,
} from '@/types/dashboard';

export function useDashboardSummary(period: Period, date?: string) {
  const params = new URLSearchParams({ period });
  if (date) params.set('date', date);
  return useQuery({
    queryKey: ['dashboard', 'summary', period, date ?? 'current'],
    queryFn: () => apiFetch<DashboardSummary>(`/dashboard/summary?${params.toString()}`),
  });
}

export function useDashboardChart(period: Period, date?: string) {
  const params = new URLSearchParams({ period });
  if (date) params.set('date', date);
  return useQuery({
    queryKey: ['dashboard', 'chart', period, date ?? 'current'],
    queryFn: () => apiFetch<ChartPoint[]>(`/dashboard/chart?${params.toString()}`),
  });
}

export function useNextLesson() {
  return useQuery({
    queryKey: ['dashboard', 'next-lesson'],
    queryFn: () => apiFetch<NextLesson | null>('/dashboard/next-lesson').then((r) => r ?? null),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

export function useChildrenStats() {
  return useQuery({
    queryKey: ['dashboard', 'children-stats'],
    queryFn: () => apiFetch<ChildrenStats>('/dashboard/children-stats'),
  });
}

export function useTeachersTable(period: Period, date?: string) {
  const params = new URLSearchParams({ period });
  if (date) params.set('date', date);
  return useQuery({
    queryKey: ['dashboard', 'teachers', period, date ?? 'current'],
    queryFn: () => apiFetch<TeacherRow[]>(`/dashboard/teachers?${params.toString()}`),
  });
}
