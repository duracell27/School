import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LessonPricesController } from './lesson-prices.controller';
import { LessonPricesService } from './lesson-prices.service';

@Module({
  imports: [AuthModule],
  controllers: [LessonPricesController],
  providers: [LessonPricesService],
  exports: [LessonPricesService],
})
export class LessonPricesModule {}
