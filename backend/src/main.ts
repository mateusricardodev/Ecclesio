import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { mkdirSync } from 'fs';
import { join } from 'path';
import helmet from 'helmet';

async function bootstrap() {
  mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Origens do frontend liberadas no CORS vêm só de FRONTEND_URL (separadas
  // por vírgula). Os endereços locais do Vite/Nest ficam liberados apenas fora
  // de produção.
  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && configuredOrigins.length === 0) {
    throw new Error('FRONTEND_URL precisa estar configurada em produção (origem do frontend para o CORS).');
  }
  const allowedOrigins = [
    ...configuredOrigins,
    ...(isProduction ? [] : ['http://localhost:5173', 'http://localhost:3000']),
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
