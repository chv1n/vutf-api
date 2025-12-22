import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  process.env.TZ = 'UTC';
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // ตัด field ที่ไม่มีใน DTO ทิ้งอัตโนมัติ
    forbidNonWhitelisted: true, // ถ้าส่ง field แปลกปลอมมา ให้แจ้ง Error 400 
    transform: true, // แปลง Type ให้ตรงกับ DTO อัตโนมัติ
  }));
  await app.listen(3000);
}
bootstrap();
