import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface JwtUser {
  sub: string;
  role: Role;
}

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  findAll(@Req() req: Request) {
    const user = req['user'] as JwtUser;
    const teacherId = user.role === Role.TEACHER ? user.sub : undefined;
    return this.children.findAll(teacherId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateChildDto) {
    return this.children.create(dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.children.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.children.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.children.remove(id);
  }
}
