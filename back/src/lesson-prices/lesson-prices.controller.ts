import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { LessonPricesService } from './lesson-prices.service';
import { CreateLessonPriceDto } from './dto/create-lesson-price.dto';
import { UpdateLessonPriceDto } from './dto/update-lesson-price.dto';
import { LessonPriceQueryDto } from './dto/lesson-price-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('lesson-prices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LessonPricesController {
  constructor(private readonly lessonPrices: LessonPricesService) {}

  @Get()
  findAll(@Query() query: LessonPriceQueryDto) { return this.lessonPrices.findAll(query); }

  @Post()
  create(@Body() dto: CreateLessonPriceDto) { return this.lessonPrices.create(dto); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.lessonPrices.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonPriceDto) {
    return this.lessonPrices.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) { return this.lessonPrices.remove(id); }
}
