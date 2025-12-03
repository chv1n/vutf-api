import { AuthModule } from './auth/auth.module';
import { UsersModule } from "./users/users.module";
import { MailModule } from './mail/mail.module';
import { InspectionRoundModule } from './inspection_round/inspection_round.module';

export const AppModules = [
    UsersModule,
    AuthModule,
    MailModule,
    InspectionRoundModule,
]

