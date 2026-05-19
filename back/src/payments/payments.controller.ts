import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PreviewPaymentDto } from './dto/preview-payment.dto';

interface JwtUser { sub: string; role: Role; }

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  findAll(@Query() query: PaymentQueryDto) {
    return this.payments.findAll(query);
  }

  @Get('school-balance')
  getSchoolBalance() {
    return this.payments.getSchoolAccountInfo();
  }

  @Get('financial-summary')
  getFinancialSummary() {
    return this.payments.getFinancialSummary();
  }

  @Get('preview')
  preview(@Query() dto: PreviewPaymentDto) {
    return this.payments.previewAllocation(dto);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.payments.create(dto, user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payments.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.payments.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.payments.remove(id);
  }

  @Post(':id/writeoff')
  writeoff(@Param('id') id: string, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.payments.writeoff(id, user.sub);
  }

  @Post(':id/topup')
  topup(@Param('id') id: string, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.payments.topup(id, user.sub);
  }
}
