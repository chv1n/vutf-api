import { Match } from './match.decorator';
import { validate } from 'class-validator';

class TestDto {
    @Match('password')
    confirmPassword: string;

    password: string;

    constructor(password: string, confirmPassword: string) {
        this.password = password;
        this.confirmPassword = confirmPassword;
    }
}

describe('MatchDecorator', () => {
    it('should pass validation if values match', async () => {
        const dto = new TestDto('password123', 'password123');
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should fail validation if values do not match', async () => {
        const dto = new TestDto('password123', 'password456');
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('Match');
    });
});
