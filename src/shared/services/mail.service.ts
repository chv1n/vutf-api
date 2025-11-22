import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailer: MailerService) {}

  async sendRegistrationOtp(email: string, otp: string): Promise<void> {
    
    await this.mailer.sendMail({
      to: email,
      subject: 'Your RMUTT Registration OTP',
      template: './registration-otp', // templates/registration-otp.hbs
      context: { otp },
    });
  }

  // ที่เหลืออนาคตเพิ่ม method อื่น ๆ ได้ เช่น sendPasswordReset, sendNotification ฯลฯ
}
