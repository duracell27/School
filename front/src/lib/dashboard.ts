import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  DashboardSummary, ChartPoint, NextLesson, ChildrenStats, TeacherRow, Period,
} from '@/types/dashboard';

export function useDashboardSummary(period: Period) {
  const qs = new URLSearchParams({ period }).toString();
  return useQuery({
    queryKey: ['dashboard', 'summary', period],
    queryFn: () => apiFetch<DashboardSummary>(`/dashboard/summary?${qs}`),
  });
}

export function useDashboardChart(period: Period) {
  const qs = new URLSearchParams({ period }).toString();
  return useQuery({
    queryKey: ['dashboard', 'chart', period],
    queryFn: () => apiFetch<ChartPoint[]>(`/dashboard/chart?${qs}`),
  });
}

export function useNextLesson() {
  return useQuery({
    queryKey: ['dashboard', 'next-lesson'],
    queryFn: () => apiFetch<NextLesson | null>('/dashboard/next-lesson'),
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

export function useTeachersTable(period: Period) {
  const qs = new URLSearchParams({ period }).toString();
  return useQuery({
    queryKey: ['dashboard', 'teachers', period],
    queryFn: () => apiFetch<TeacherRow[]>(`/dashboard/teachers?${qs}`),
  });
}
