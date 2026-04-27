import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LessonPricesModule } from '../lesson-prices/lesson-prices.module';
import { PaymentsModule } from '../payments/payments.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [AuthModule, LessonPricesModule, PaymentsModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
