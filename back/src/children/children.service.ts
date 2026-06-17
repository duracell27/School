import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { AddSubjectDto } from './dto/add-subject.dto';

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
  status: true,
  subjects: {
    select: {
      id: true,
      subject: true,
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChildSelect;

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teacherId?: string) {
    return this.prisma.child.findMany({
      where: teacherId ? { subjects: { some: { teacherId } } } : undefined,
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
    return this.prisma.child.update({ where: { id }, data, select: childSelect });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.child.delete({ where: { id } });
  }

  async addSubject(childId: string, dto: AddSubjectDto) {
    try {
      return await this.prisma.childSubject.create({
        data: { childId, teacherId: dto.teacherId, subject: dto.subject },
        select: { id: true, subject: true, teacher: { select: { id: true, name: true } } },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Subject already assigned for this teacher');
      }
      throw e;
    }
  }

  async removeSubject(subjectId: string): Promise<void> {
    const record = await this.prisma.childSubject.findUnique({ where: { id: subjectId } });
    if (!record) throw new NotFoundException('Subject assignment not found');
    await this.prisma.childSubject.delete({ where: { id: subjectId } });
  }

  async getStats(childId: string) {
    await this.findOne(childId);   // throws NotFoundException if not found
    const lessons = await this.prisma.lesson.findMany({
      where: { childId, status: 'CONDUCTED' },
      select: { startDate: true, price: true },
      orderBy: { startDate: 'asc' },
    });

    const totalLessons = lessons.length;
    const totalEarned = lessons.reduce((sum, l) => sum + Number(l.price), 0);

    let avgPerMonth = 0;
    if (totalLessons > 0) {
      const first = new Date(lessons[0].startDate);
      const now = new Date();
      const monthsDiff =
        (now.getFullYear() - first.getFullYear()) * 12 +
        (now.getMonth() - first.getMonth());
      const months = Math.max(1, monthsDiff + 1);
      avgPerMonth = Math.round((totalLessons / months) * 10) / 10;
    }

    return { totalLessons, avgPerMonth, totalEarned: Math.round(totalEarned * 100) / 100 };
  }
}
