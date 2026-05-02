// User Model
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}
