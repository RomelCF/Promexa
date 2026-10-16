import { Injectable, ConflictException } from '@nestjs/common';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private users: User[] = [
    {
      id: 'usr-1',
      name: 'Carlos Mendoza',
      email: 'carlos@promexa.com',
      passwordHash: bcrypt.hashSync('promexa123', 10),
      profileType: 'business',
      isVerified: true,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH3UDaH5S4ho_6H4oKGGbzvRDc6LorHWo-1pfiUJf12W1Auj4lfoQJv49kAmTodxRQ2qjn9Gw3OCKEgNjPAaYs7bWaSTa1ib_zIwwkI7_Q-YO8vrIQcqc93EcFCKTlM8e8icVlD5kHDDY2RToEXmganGu3acS1w16yAXHMOQI9YlC8xg_qHtttlbMKoseK0hFBvd51mYVAjPwV2omGzRF7l9YtdZHuawkgmcCUf4Q',
      role: 'business',
      createdAt: new Date(),
    },
    {
      id: 'usr-2',
      name: 'Don Pedro Tostaduría',
      email: 'donpedro@cafe.pe',
      passwordHash: bcrypt.hashSync('promexa123', 10),
      profileType: 'business',
      isVerified: true,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVmOH_0LfgKtRrDGfcsmpwLcxKI-qogdYhZsxdqQoOmMDkrE_vsjcq7ZSrbmIc64hmGsuXThjH01bweDQ86iBMNYKYJvijWqr8udkZt0Fv2OzjScCgTqltUH_mqfJVrcCl1bAUCCuWhpiwhIj8nALEatyqGmn2ozrHL0iKq-MwPKzX8ahWnKverkC3WoDO39ecYoRUTWg8KCnqyu8P3gsvX39oXxxL3JePZdazD94',
      role: 'business',
      createdAt: new Date(),
    },
  ];

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    profileType: 'personal' | 'business';
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      profileType: data.profileType,
      isVerified: data.profileType === 'business' ? false : true,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD5YgK5OwWWd0N5wvQzxa-JtNh1D8GM3Oja_Tu3qqrorn6jC2BjXdKKTqo4lXgJ7FkBosiqIF5mzcyRpeY_oopKqy7tFaUM5RDrz0xE_iz0hQBRiF7ngOYX657hjt6n70yZhEbwvo8a66cOcspLkAkekpk9zk1rO1RcSAbieaR7zQmXZ-aDIjKUd6sC73PhNeL5hLgtadnTIQcTptE2HsAe6VSNdlfojx9rsWGTLc',
      role: data.profileType === 'business' ? 'business' : 'user',
      createdAt: new Date(),
    };

    this.users.push(newUser);
    return newUser;
  }
}
