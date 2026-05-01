import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { Child, ChildSubject, CreateChildPayload, UpdateChildPayload } from '@/types/child';
import type { Subject } from '@/types/lesson';

export function useChildren(filters: { teacherId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  const qs = params.toString();
  return useQuery({
    queryKey: ['children', filters],
    queryFn: () => apiFetch<Child[]>(`/children${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChildPayload) =>
      apiFetch<Child>('/children', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChildPayload }) =>
      apiFetch<Child>(`/children/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useDeleteChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/children/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useAddSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, teacherId, subject }: { childId: string; teacherId: string; subject: Subject }) =>
      apiFetch<ChildSubject>(`/children/${childId}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ teacherId, subject }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useRemoveSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, subjectId }: { childId: string; subjectId: string }) =>
      apiFetch(`/children/${childId}/subjects/${subjectId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}
