export type Role = 'ADMIN' | 'TEACHER';
export type EmploymentStatus = 'WORKING' | 'FIRED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string | null;
  status: EmploymentStatus;
  hireDate: string | null;
  terminationDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: Role;
  avatar?: string;
  status?: EmploymentStatus;
  hireDate?: string;
  terminationDate?: string;
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
  avatar?: string;
  status?: EmploymentStatus;
  hireDate?: string;
  terminationDate?: string;
}
