import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

const childSelect = {
  id: true,
  name: true,
  age: true,
  country: true,
  avatar: true,
  hireDate: true,
  graduationDate: true,
  parentContacts: true,
  timezone: true,
  teacherId: true,
  teacher: {
    select: { id: true, name: true },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChildSelect;

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teacherId?: string) {
    return this.prisma.child.findMany({
      where: teacherId ? { teacherId } : undefined,
      select: childSelect,
    });
  }

  async findOne(id: string) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      select: childSelect,
    });
    if (!child) throw new NotFoundException('Child not found');
    return child;
  }

  async create(dto: CreateChildDto) {
    const { hireDate, graduationDate, ...rest } = dto;
    return this.prisma.child.create({
      data: {
        ...rest,
        country: rest.country ?? 'UA',
        parentContacts: (rest.parentContacts ?? []) as unknown as Prisma.InputJsonValue,
        ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
        ...(graduationDate ? { graduationDate: new Date(graduationDate) } : {}),
      },
      select: childSelect,
    });
  }

  async update(id: string, dto: UpdateChildDto) {
    await this.findOne(id);
    const { hireDate, graduationDate, parentContacts, ...rest } = dto;
    const data: Prisma.ChildUpdateInput = {
      ...rest,
      ...(parentContacts !== undefined
        ? { parentContacts: parentContacts as unknown as Prisma.InputJsonValue }
        : {}),
      ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
      ...(graduationDate ? { graduationDate: new Date(graduationDate) } : {}),
    };
    return this.prisma.child.update({
      where: { id },
      data,
      select: childSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.child.delete({ where: { id } });
  }
}
