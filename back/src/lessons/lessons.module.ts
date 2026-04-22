import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LessonPricesModule } from '../lesson-prices/lesson-prices.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [AuthModule, LessonPricesModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
