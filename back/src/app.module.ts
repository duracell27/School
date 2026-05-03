import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { LessonPricesModule } from './lesson-prices/lesson-prices.module';
import { LessonsModule } from './lessons/lessons.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentsModule } from './payments/payments.module';
import { CommissionsModule } from './commissions/commissions.module';
import { LessonNotesModule } from './lesson-notes/lesson-notes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChildrenModule,
    LessonPricesModule,
    LessonsModule,
    DashboardModule,
    PaymentsModule,
    CommissionsModule,
    LessonNotesModule,
  ],
})
export class AppModule {}
