import { IsEmail, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  @Matches(/@mail\.rmutt\.ac\.th$/, {
    message: 'Email must end with @mail.rmutt.ac.th',
  })
  email: string;
}
