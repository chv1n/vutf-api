import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailer: MailerService) { }

  async sendRegistrationOtp(email: string, otp: string): Promise<void> {

    await this.mailer.sendMail({
      to: email,
      subject: 'Your RMUTT Registration OTP',
      template: './registration-otp', // templates/registration-otp.hbs
      context: { otp },
    });
  }

  async sendForgotPassword(email: string, otp: string) {
    await this.mailer.sendMail({
      to: email,
      subject: 'Reset Password OTP',
      template: './registration-otp',
      context: { otp },
    });
    // console.log(`[MailService] Sent Forgot Password OTP to ${email}`);
  }
}
