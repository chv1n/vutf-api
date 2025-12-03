import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';

describe('OtpService', () => {
    let service: OtpService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OtpService],
        }).compile();

        service = module.get<OtpService>(OtpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generate6Digits', () => {
        it('should return a 6-digit string', () => {
            const otp = service.generate6Digits();
            expect(otp).toMatch(/^\d{6}$/);
        });

        it('should return different values', () => {
            const otp1 = service.generate6Digits();
            const otp2 = service.generate6Digits();
            // There is a tiny chance they are equal, but very unlikely
            if (otp1 === otp2) {
                const otp3 = service.generate6Digits();
                expect(otp1).not.toBe(otp3);
            } else {
                expect(otp1).not.toBe(otp2);
            }
        });
    });
});
