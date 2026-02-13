// src/shared/shared.module.ts
import { Module, Global } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { RedisService } from './services/redis.service';
import { OtpService } from './services/otp.service';
import { FileUrlService } from './services/file-url.service';

@Global()
@Module({
  providers: [MailService, RedisService, OtpService, FileUrlService],
  exports: [MailService, RedisService, OtpService, FileUrlService],
})
export class SharedModule {}
