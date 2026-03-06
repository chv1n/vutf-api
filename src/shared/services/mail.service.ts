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

  async sendUnsubmittedReminder(
    emails: string[],
    thesisTitle: string,
    roundLabel: string,
    deadline: string
  ) {
    await this.mailer.sendMail({
      to: emails,
      subject: `[Reminder] Thesis Submission Pending: ${thesisTitle}`,
      html: `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #334155;">
        <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin-bottom: 24px; letter-spacing: -0.025em;">
            Submission Reminder
        </h1>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            Our records indicate that your group has not yet submitted the required documents for 
            <span style="font-weight: 600; color: #1e40af;">${roundLabel}</span>.
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #f1f5f9;">
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">
                    Thesis Title
                </label>
                <div style="font-size: 18px; line-height: 1.6; color: #1e293b; font-weight: 500;">
                    ${thesisTitle}
                </div>
            </div>
            
            <div>
                <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.05em;">
                    Deadline
                </label>
                <div style="font-size: 16px; color: #ef4444; font-weight: 600;">
                    ${deadline}
                </div>
            </div>
        </div>

        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-top: 32px;">
            Please log in to the portal and complete your submission before the deadline to avoid any delays in your evaluation process.
        </p>
        
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                This is an automated system notification from Thesis Review System.
            </p>
        </div>
    </div>
  `,
    });
  }

  async sendReviewResult(
    email: string,
    thesisTitle: string,
    status: string,
    comment?: string
  ) {
    const statusThai = {
      'PASSED': 'ผ่านการตรวจสอบ',
      'NEEDS_REVISION': 'ต้องแก้ไข',
      'NOT_PASSED': 'ไม่ผ่านการตรวจสอบ'
    };

    const displayStatus = statusThai[status] || status;

    await this.mailer.sendMail({
      to: email,
      subject: `แจ้งผลการตรวจสอบเอกสาร: ${thesisTitle}`,
      html: `
      <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #333;">แจ้งผลการตรวจสอบเอกสาร</h2>
        <p>หัวข้อวิทยานิพนธ์: <strong>${thesisTitle}</strong></p>
        <p>ผลการตรวจสอบ: <span style="font-weight: bold; color: #1e40af;">${displayStatus}</span></p>
        ${comment ? `<p>ความคิดเห็นจากอาจารย์: <br> <i style="color: #666;">"${comment}"</i></p>` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 14px; color: #888;">กรุณาตรวจสอบรายละเอียดเพิ่มเติมในระบบ Thesis Review System</p>
      </div>
    `,
    });
  }
}
