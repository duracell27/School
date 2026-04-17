export type Role = 'ADMIN' | 'TEACHER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: Role;
  avatar?: string;
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
  avatar?: string;
}
