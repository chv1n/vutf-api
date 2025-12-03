// src/modules/inspection_round/inspection_round.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionRoundService } from './inspection_round.service';
import { InspectionRoundController } from './inspection_round.controller';
import { InspectionRound } from './entities/inspection_round.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InspectionRound]),
  ],
  controllers: [InspectionRoundController],
  providers: [InspectionRoundService],
  exports: [InspectionRoundService],
})
export class InspectionRoundModule {}