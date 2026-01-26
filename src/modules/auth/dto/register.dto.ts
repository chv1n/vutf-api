import {
    IsString,
    IsNotEmpty,
    Matches,
    MinLength,
    IsNumber,
} from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

export class RegisterDto {

    @IsString()
    @IsNotEmpty()
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, {
        message:
            'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และต้องประกอบด้วยตัวอักษรและตัวเลข',
    })
    password: string;

    @IsString()
    @IsNotEmpty()
    @Match('password', { message: 'รหัสผ่านไม่ตรงกัน' })
    confirmPassword: string;


    @IsString()
    @IsNotEmpty()
    @Matches(/^(นาย|นาง|นางสาว)$/, {
        message: 'คำนำหน้าชื่อต้องเป็น นาย, นาง, หรือ นางสาว เท่านั้น',
    })
    prefixName: string;


    @IsString()
    @IsNotEmpty()
    @Matches(/^[ก-๙\s]+$/, {
        message: 'ชื่อจริงต้องเป็นภาษาไทยเท่านั้น',
    })
    firstName: string;


    @IsString()
    @IsNotEmpty()
    @Matches(/^[ก-๙\s]+$/, {
        message: 'นามสกุลต้องเป็นภาษาไทยเท่านั้น',
    })
    lastName: string;


    @IsString()
    @IsNotEmpty()
    @Matches(/^0[0-9]{9}$/, {
        message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก',
    })
    phone: string;

    @IsNotEmpty({ message: 'กรุณาระบุกลุ่มเรียน' })
    @IsNumber({}, { message: 'รหัสกลุ่มเรียนต้องเป็นตัวเลข' })
    sectionId: number;
}
