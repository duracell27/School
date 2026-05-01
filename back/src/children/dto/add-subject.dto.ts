import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Subject } from '@prisma/client';

export class AddSubjectDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsEnum(Subject)
  subject: Subject;
}
