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
  }

  async sendInviteStudent(email: string, link: string) {
    await this.mailer.sendMail({
      to: email,
      subject: 'คำเชิญเข้าร่วมระบบ (Thesis Review System)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3 style="color: #333;">คุณได้รับคำเชิญให้เข้าร่วมระบบ</h3>
            <p style="font-size: 16px;">กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านและกรอกข้อมูลส่วนตัว:</p>
            <p>
              <a href="${link}" style="display: inline-block;
                    margin-top: 8px;
                    color: #4b5563;
                    text-decoration: none;
                    font-weight: 600;
                    border: 1px solid #d1d5db;
                    padding: 8px 20px;
                    border-radius: 6px;
                    font-size: 16px;">
                accept
              </a>
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 16px; color: #999;">หากคุณไม่ได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้</p>
        </div>
      `,
    });
  }
}
