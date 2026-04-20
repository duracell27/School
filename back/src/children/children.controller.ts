import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  findAll() {
    return this.children.findAll();
  }

  @Post()
  create(@Body() dto: CreateChildDto) {
    return this.children.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.children.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.children.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.children.remove(id);
  }
}
