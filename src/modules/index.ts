import { AuthModule } from './auth/auth.module';
import { UsersModule } from "./users/users.module";
import { MailModule } from './mail/mail.module';

export const AppModules = [
    UsersModule,
    AuthModule,
    MailModule,
]

