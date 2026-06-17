import { execFileSync } from 'child_process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('Running prisma db push...');
      execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push'], {
        stdio: 'inherit',
      });
      console.log('Prisma db push completed.');
    } catch (error) {
      console.error('Prisma db push failed:', error);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
