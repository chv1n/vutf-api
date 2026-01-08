import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('MailService', () => {
    let service: MailService;
    let mailerService: Partial<MailerService>;

    beforeEach(async () => {
        mailerService = {
            sendMail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MailService,
                { provide: MailerService, useValue: mailerService },
            ],
        }).compile();

        service = module.get<MailService>(MailService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendRegistrationOtp', () => {
        it('should send email with OTP', async () => {
            await service.sendRegistrationOtp('test@test.com', '123456');

            expect(mailerService.sendMail).toHaveBeenCalledWith({
                to: 'test@test.com',
                subject: 'Your RMUTT Registration OTP',
                template: './registration-otp',
                context: { otp: '123456' },
            });
        });
    });

    describe('sendForgotPassword', () => {
        it('should send email with OTP', async () => {
            await service.sendForgotPassword('test@test.com', '654321');

            expect(mailerService.sendMail).toHaveBeenCalledWith({
                to: 'test@test.com',
                subject: 'Reset Password OTP',
                template: './registration-otp',
                context: { otp: '654321' },
            });
        });
    });
});
