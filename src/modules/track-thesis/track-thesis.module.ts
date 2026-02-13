import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackThesisController } from './track-thesis.controller';
import { TrackThesisService } from './track-thesis.service';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { SharedModule } from '../../shared/shared.module';
import { InspectionRoundModule } from '../inspection_round/inspection_round.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThesisGroup]), 
    InspectionRoundModule,
    SharedModule
  ],
  controllers: [TrackThesisController],
  providers: [TrackThesisService],
  exports: [TrackThesisService],
})
export class TrackThesisModule {}