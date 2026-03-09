import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  process.env.TZ = 'UTC';
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // บอกให้ Express เชื่อถือ Header ที่ส่งมาจาก Proxy
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  
  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const allowedOrigins = frontendUrl 
    ? frontendUrl.split(',') 
    : ['http://localhost:5173'];
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(cookieParser());
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัด field ที่ไม่มีใน DTO ทิ้งอัตโนมัติ
      forbidNonWhitelisted: true, // ถ้าส่ง field แปลกปลอมมา ให้แจ้ง Error 400
      transform: true, // แปลง Type ให้ตรงกับ DTO อัตโนมัติ
    }),
  );
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
}
bootstrap();