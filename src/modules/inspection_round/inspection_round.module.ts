import { Module } from '@nestjs/common';
import { InspectionRoundService } from './inspection_round.service';
import { InspectionRoundController } from './inspection_round.controller';

@Module({
  controllers: [InspectionRoundController],
  providers: [InspectionRoundService],
})
export class InspectionRoundModule {}
