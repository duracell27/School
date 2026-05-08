import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  Lesson, LessonPrice, ChildBalance,
  CreateLessonPayload, UpdateLessonPayload,
  CreateLessonPricePayload, UpdateLessonPricePayload,
} from '@/types/lesson';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export function useLessons(filters: { teacherId?: string; weekStart?: string; date?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  if (filters.weekStart) params.set('weekStart', filters.weekStart);
  if (filters.date) params.set('date', filters.date);
  const qs = params.toString();
  return useQuery({
    queryKey: ['lessons', filters],
    queryFn: () => apiFetch<Lesson[]>(`/lessons${qs ? `?${qs}` : ''}`),
  });
}

export function useLessonsPaginated(filters: { teacherId?: string; date?: string; page: number; limit: number }) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  if (filters.date) params.set('date', filters.date);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return useQuery({
    queryKey: ['lessons', filters],
    queryFn: () => apiFetch<Paginated<Lesson>>(`/lessons?${params.toString()}`),
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLessonPayload) =>
      apiFetch<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['child-balances'] });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonPayload }) =>
      apiFetch<Lesson>(`/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['lessons'] });
      const previousQueries = queryClient.getQueriesData<Lesson[]>({ queryKey: ['lessons'] });
      queryClient.setQueriesData<Lesson[]>({ queryKey: ['lessons'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((lesson) =>
          lesson.id !== id
            ? lesson
            : { ...lesson, ...data, child: lesson.child, teacher: lesson.teacher } as Lesson
        );
      });
      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['child-balances'] });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/lessons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['child-balances'] });
    },
  });
}

export function useCopyFromPrevWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { targetWeekStart: string; teacherId?: string }) =>
      apiFetch<{ created: number }>('/lessons/copy-from-prev-week', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function usePriceSuggestion(
  childId: string | null,
  teacherId: string | null,
  startDate: string | null,
  subject?: string | null,
) {
  return useQuery({
    queryKey: ['price-suggestion', childId, teacherId, startDate, subject],
    queryFn: async () => {
      const params = new URLSearchParams({
        childId: childId!,
        teacherId: teacherId!,
        startDate: startDate!,
      });
      if (subject) params.set('subject', subject);
      const result = await apiFetch<number | null>(`/lessons/price-suggestion?${params}`);
      return result ?? null;
    },
    enabled: !!(childId && teacherId && startDate),
  });
}

export function useLessonPrices() {
  return useQuery({
    queryKey: ['lesson-prices'],
    queryFn: () => apiFetch<LessonPrice[]>('/lesson-prices'),
  });
}

export function useLessonPricesPaginated(filters: { page: number; limit: number }) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return useQuery({
    queryKey: ['lesson-prices', filters],
    queryFn: () => apiFetch<Paginated<LessonPrice>>(`/lesson-prices?${params.toString()}`),
  });
}

export function useCreateLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLessonPricePayload) =>
      apiFetch<LessonPrice>('/lesson-prices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useUpdateLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonPricePayload }) =>
      apiFetch<LessonPrice>(`/lesson-prices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useDeleteLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/lesson-prices/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useChildBalances() {
  return useQuery({
    queryKey: ['child-balances'],
    queryFn: () => apiFetch<ChildBalance[]>('/lessons/child-balances'),
  });
}

export function useOverdueCount() {
  return useQuery({
    queryKey: ['lessons', 'overdue-count'],
    queryFn: () => apiFetch<number>('/lessons/overdue-count'),
    refetchInterval: 5 * 60 * 1000,
  });
}
