import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

const mockUser = {
  id: 'cuid1',
  email: 'teacher@example.com',
  name: 'John Teacher',
  role: Role.TEACHER,
  avatar: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const prismaMock = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns an array of users', async () => {
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      expect(await service.findAll()).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('returns a user by id', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      expect(await service.findOne('cuid1')).toEqual(mockUser);
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('hashes password and creates user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
        role: Role.TEACHER,
      });

      expect(bcryptMock.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toEqual(mockUser);
    });

    it('throws ConflictException when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.create({
          email: 'teacher@example.com',
          name: 'Dup',
          password: 'password123',
          role: Role.TEACHER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates and returns the user', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue({ ...mockUser, name: 'New Name' });

      const result = await service.update('cuid1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('throws ConflictException when new email belongs to another user', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, id: 'other-id' });

      await expect(
        service.update('cuid1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows updating email to the same address', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);

      await expect(
        service.update('cuid1', { email: mockUser.email }),
      ).resolves.toBeDefined();
    });

    it('hashes password when provided in update', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);
      bcryptMock.hash.mockResolvedValue('new-hashed' as any);

      await service.update('cuid1', { password: 'newpassword123' });

      expect(bcryptMock.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'new-hashed' }),
        }),
      );
    });

    it('does not call hash when password is not provided', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);

      await service.update('cuid1', { name: 'Only Name' });

      expect(bcryptMock.hash).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.delete.mockResolvedValue(mockUser);
      await expect(service.remove('cuid1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
