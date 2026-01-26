import { AuthModule } from './auth/auth.module';
import { UsersModule } from "./users/users.module";
import { StudentModule } from './student/student.module';
import { InstructorModule } from './instructor/instructor.module';
import { MailModule } from './mail/mail.module';
import { InspectionRoundModule } from './inspection_round/inspection_round.module';
import { ThesisGroupModule } from './thesis-group/thesis-group.module';

import { AnnouncementsModule } from './announcements/announcements.module';
import { SubmissionsModule } from './submissions/submissions.module';

import { ThesisModule } from './thesis/thesis.module';
import { GroupMemberModule } from './group-member/group-member.module';
import { AdvisorAssignmentModule } from './advisor-assignment/advisor-assignment.module';


export const AppModules = [
    SubmissionsModule,
    UsersModule,
    StudentModule,
    InstructorModule,
    AuthModule,
    MailModule,
    InspectionRoundModule,
    ThesisGroupModule,

    AnnouncementsModule,





    ThesisModule,
    GroupMemberModule,
    AdvisorAssignmentModule,
]

