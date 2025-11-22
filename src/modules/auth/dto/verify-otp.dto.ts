import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  @Matches(/@mail\.rmutt\.ac\.th$/, {
    message: 'Email must end with @mail.rmutt.ac.th',
  })
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
