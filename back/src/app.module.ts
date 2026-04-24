import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { LessonPricesModule } from './lesson-prices/lesson-prices.module';
import { LessonsModule } from './lessons/lessons.module';
import { DashboardModule } from './dashboard/dashboard.module';

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
  ],
})
export class AppModule {}
