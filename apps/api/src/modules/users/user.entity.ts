export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  profileType: 'personal' | 'business';
  isVerified: boolean;
  avatar: string;
  role: 'user' | 'business' | 'admin';
  createdAt: Date;
}
