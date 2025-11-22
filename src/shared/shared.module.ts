import { Module } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { RedisService } from './services/redis.service';
import { OtpService } from './services/otp.service';

@Module({
  providers: [MailService, RedisService, OtpService],
  exports: [MailService, RedisService, OtpService],
})
export class SharedModule {}
