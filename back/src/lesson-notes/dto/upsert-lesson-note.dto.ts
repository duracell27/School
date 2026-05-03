import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertLessonNoteDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  imageData?: string;
}
