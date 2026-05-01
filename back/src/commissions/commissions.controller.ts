import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser { sub: string; role: Role; }

@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get()
  getAllWithBalances() {
    return this.service.getAllTeachersWithBalances();
  }

  @Get(':teacherId/balance')
  getBalance(@Param('teacherId') teacherId: string) {
    return this.service.getTeacherBalance(teacherId);
  }

  @Get(':teacherId/rate')
  getRates(@Param('teacherId') teacherId: string) {
    return this.service.getCommissions(teacherId);
  }

  @Post('rate')
  setRate(@Body() dto: CreateCommissionDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.service.setCommission(dto, user.sub);
  }

  @Get(':teacherId/payouts')
  getPayouts(@Param('teacherId') teacherId: string) {
    return this.service.getPayouts(teacherId);
  }

  @Post('payouts')
  createPayout(@Body() dto: CreatePayoutDto, @Req() req: Request) {
    const user = req['user'] as JwtUser;
    return this.service.createPayout(dto, user.sub);
  }

  @Patch('payouts/:id')
  updatePayout(@Param('id') id: string, @Body() dto: UpdatePayoutDto) {
    return this.service.updatePayout(id, dto);
  }

  @Delete('payouts/:id')
  @HttpCode(204)
  deletePayout(@Param('id') id: string) {
    return this.service.deletePayout(id);
  }
}
