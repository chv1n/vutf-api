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

import { StorageModule } from '../common/modules/storage.module';
import { ThesisTopicModule } from './thesis-topic/thesis-topic.module';
import { ClassSectionsModule } from './class-sections/class-sections.module'; import { DocConfigModule } from './doc-config/doc-config.module';
import { ReportFileModule } from './report-file/report-file.module';
import { RabbitmqModule } from '../shared/rabbitmq/rabbitmq.module';

import { TrackThesisModule } from './track-thesis/track-thesis.module';
import { ExportFileModule } from './export-file/export-file.module';
import { ThesisFilesModule } from './thesis-files/thesis-files.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PermissionsModule } from './permissions/permissions.module';


export const AppModules = [
    RabbitmqModule,
    ReportFileModule,
    DocConfigModule,
    StorageModule,
    SubmissionsModule,
    UsersModule,
    StudentModule,
    InstructorModule,
    AuthModule,
    MailModule,
    InspectionRoundModule,
    ThesisGroupModule,

    AnnouncementsModule,

    ThesisTopicModule,
    ClassSectionsModule,


    ThesisModule,
    GroupMemberModule,
    AdvisorAssignmentModule,
    TrackThesisModule,
    ExportFileModule,
    ThesisFilesModule,
    AuditLogModule,
    NotificationsModule,
    DashboardModule,
    PermissionsModule,
]

