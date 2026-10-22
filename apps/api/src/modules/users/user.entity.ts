export type Role = 'USER' | 'BUSINESS' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  profileType: 'personal' | 'business';
  isVerified: boolean;
  avatar: string;
  role: Role;
  createdAt: Date;
}
