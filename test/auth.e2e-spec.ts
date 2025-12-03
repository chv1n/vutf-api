import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { MailService } from './../src/shared/services/mail.service';
import { OtpService } from './../src/shared/services/otp.service';
import cookieParser from 'cookie-parser';

describe('AuthController (e2e)', () => {
    let app: INestApplication;
    let agent: ReturnType<typeof request.agent>;

    const mockMailService = {
        sendRegistrationOtp: jest.fn(),
        sendForgotPassword: jest.fn(),
    };

    const mockOtpService = {
        generate6Digits: jest.fn().mockReturnValue('123456'),
    };

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(MailService)
            .useValue(mockMailService)
            .overrideProvider(OtpService)
            .useValue(mockOtpService)
            .compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.use(cookieParser());
        await app.init();

        agent = request.agent(app.getHttpServer());
    });

    afterAll(async () => {
        await app.close();
    });

    const testEmail = `test_${Date.now()}@mail.rmutt.ac.th`;
    const testPassword = 'Password123';

    it('should register, login, refresh, and logout', async () => {
        // 1. Request OTP
        await agent
            .post('/api/v1/auth/request-registration-otp')
            .send({ email: testEmail })
            .expect(200);

        // 2. Verify OTP
        const verifyRes = await agent
            .post('/api/v1/auth/verify-registration-otp')
            .send({ email: testEmail, otp: '123456' })
            .expect(200);

        expect(verifyRes.body).toHaveProperty('registrationToken');
        // Check if cookie is set (supertest agent handles it, but good to verify)
        // console.log('Cookies after verify:', verifyRes.headers['set-cookie']);

        // 3. Register
        await agent
            .post('/api/v1/auth/register')
            .send({
                password: testPassword,
                confirmPassword: testPassword,
                prefixName: 'นาย',
                firstName: 'ทดสอบ',
                lastName: 'ระบบ',
                phone: '0812345678',
            })
            .expect(201);

        // 4. Login
        const loginRes = await agent
            .post('/api/v1/auth/login')
            .send({ email: testEmail, password: testPassword })
            .expect(200);

        expect(loginRes.body).toHaveProperty('userId');
        expect(loginRes.headers['set-cookie']).toBeDefined();

        // 5. Refresh Token
        // Agent automatically sends cookies from previous response
        const refreshRes = await agent
            .post('/api/v1/auth/refresh')
            .expect(200);

        expect(refreshRes.body).toHaveProperty('message', 'Token refreshed');
        expect(refreshRes.headers['set-cookie']).toBeDefined();

        // 6. Logout
        await agent
            .post('/api/v1/auth/logout')
            .expect(200);

        // Verify cookies are cleared (optional, depends on implementation)
    });
});
