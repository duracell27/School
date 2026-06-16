export type ChildStatus = 'STUDYING' | 'VACATION' | 'PAUSED';

export interface ParentContact {
  label: string;
  phone: string;
}

export interface ChildSubject {
  id: string;
  subject: 'MATH' | 'UKRAINIAN';
  teacher: { id: string; name: string };
}

export interface Child {
  id: string;
  name: string;
  age: number;
  country: string;
  avatar: string | null;
  hireDate: string | null;
  graduationDate: string | null;
  parentContacts: ParentContact[];
  timezone: string;
  status: ChildStatus;
  subjects: ChildSubject[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateChildPayload {
  name: string;
  age: number;
  country?: string;
  avatar?: string;
  hireDate?: string;
  graduationDate?: string;
  parentContacts?: ParentContact[];
  timezone: string;
  status?: ChildStatus;
}

export interface UpdateChildPayload {
  name?: string;
  age?: number;
  country?: string;
  avatar?: string;
  hireDate?: string;
  graduationDate?: string;
  parentContacts?: ParentContact[];
  timezone?: string;
  status?: ChildStatus;
}
