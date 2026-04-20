import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  status: true,
  hireDate: true,
  terminationDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: userSelect });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const password = await bcrypt.hash(dto.password, 10);
    const { hireDate, terminationDate, ...rest } = dto;
    return this.prisma.user.create({
      data: {
        ...rest,
        password,
        ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
        ...(terminationDate ? { terminationDate: new Date(terminationDate) } : {}),
      },
      select: userSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }
    const { password, hireDate, terminationDate, ...rest } = dto;
    const data: Prisma.UserUpdateInput = {
      ...rest,
      ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
      ...(terminationDate ? { terminationDate: new Date(terminationDate) } : {}),
    };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }

  updateRefreshToken(id: string, refreshToken: string | null) {
    return this.prisma.user.update({ where: { id }, data: { refreshToken } });
  }
}
