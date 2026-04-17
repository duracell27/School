import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

const mockUser = {
  id: 'cuid1',
  email: 'teacher@example.com',
  name: 'John Teacher',
  password: 'hashed-password',
  role: Role.TEACHER,
  avatar: null,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRes: any = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
};

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<UsersService>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    users = module.get(UsersService);
    jwt = module.get(JwtService);
  });

  describe('register', () => {
    it('creates a user and returns access_token', async () => {
      users.findByEmail.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'cuid1',
        email: 'teacher@example.com',
        name: 'John Teacher',
        role: Role.TEACHER,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      users.updateRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.register(
        { email: 'teacher@example.com', name: 'John Teacher', password: 'password123' },
        mockRes,
      );

      expect(result.access_token).toBe('mock-token');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-token',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      users.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register(
          { email: 'teacher@example.com', name: 'John', password: 'pass1234' },
          mockRes,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns access_token on valid credentials', async () => {
      users.findByEmail.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true);
      users.updateRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.login(
        { email: 'teacher@example.com', password: 'password123' },
        mockRes,
      );

      expect(result.access_token).toBe('mock-token');
    });

    it('throws UnauthorizedException when user not found', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'pass1234' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      users.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);
      await expect(
        service.login({ email: 'teacher@example.com', password: 'wrongpass' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('clears refresh token in DB and cookie', async () => {
      users.updateRefreshToken.mockResolvedValue(undefined as any);
      const result = await service.logout('cuid1', mockRes);
      expect(users.updateRefreshToken).toHaveBeenCalledWith('cuid1', null);
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('refresh', () => {
    it('returns new access_token with valid refresh token', async () => {
      jwt.verify.mockReturnValue({ sub: 'cuid1' } as any);
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh',
      });
      bcryptMock.compare.mockResolvedValue(true);
      users.updateRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.refresh('valid-token', mockRes);
      expect(result.access_token).toBe('mock-token');
    });

    it('throws UnauthorizedException on invalid JWT signature', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      await expect(service.refresh('bad-token', mockRes)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token hash does not match stored value', async () => {
      jwt.verify.mockReturnValue({ sub: 'cuid1' } as any);
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh',
      });
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);
      await expect(service.refresh('tampered-token', mockRes)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
