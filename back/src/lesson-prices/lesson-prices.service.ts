import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonPriceDto } from './dto/create-lesson-price.dto';
import { UpdateLessonPriceDto } from './dto/update-lesson-price.dto';

const lessonPriceSelect = {
  id: true,
  child: { select: { id: true, name: true, avatar: true } },
  teacher: { select: { id: true, name: true, avatar: true } },
  price: true,
  subject: true,
  effectiveDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonPriceSelect;

@Injectable()
export class LessonPricesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.lessonPrice.findMany({
      select: lessonPriceSelect,
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const lp = await this.prisma.lessonPrice.findUnique({
      where: { id },
      select: lessonPriceSelect,
    });
    if (!lp) throw new NotFoundException('LessonPrice not found');
    return lp;
  }

  create(dto: CreateLessonPriceDto) {
    return this.prisma.lessonPrice.create({
      data: {
        childId: dto.childId,
        teacherId: dto.teacherId,
        price: dto.price,
        effectiveDate: new Date(dto.effectiveDate),
        ...(dto.subject ? { subject: dto.subject } : {}),
      },
      select: lessonPriceSelect,
    });
  }

  async update(id: string, dto: UpdateLessonPriceDto) {
    await this.findOne(id);
    return this.prisma.lessonPrice.update({
      where: { id },
      data: {
        ...(dto.childId !== undefined ? { childId: dto.childId } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.effectiveDate !== undefined ? { effectiveDate: new Date(dto.effectiveDate) } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      },
      select: lessonPriceSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.lessonPrice.delete({ where: { id } });
  }
}
