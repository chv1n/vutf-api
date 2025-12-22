import { Module } from '@nestjs/common';
import { ThesisGroupService } from './thesis_group.service';
import { ThesisGroupController } from './thesis_group.controller';

@Module({
  controllers: [ThesisGroupController],
  providers: [ThesisGroupService],
})
export class ThesisGroupModule {}
