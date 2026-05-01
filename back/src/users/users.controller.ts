import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.users.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role !== Role.ADMIN && role !== Role.ADMIN_TEACHER && userId !== id) {
      throw new ForbiddenException('Access denied');
    }
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role !== Role.ADMIN && role !== Role.ADMIN_TEACHER && userId !== id) {
      throw new ForbiddenException('Access denied');
    }
    if (role !== Role.ADMIN && role !== Role.ADMIN_TEACHER && dto.role !== undefined) {
      throw new ForbiddenException('Cannot change your own role');
    }
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
