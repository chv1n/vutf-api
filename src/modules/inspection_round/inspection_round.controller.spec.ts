import { Test, TestingModule } from '@nestjs/testing';
import { InspectionRoundController } from './inspection_round.controller';
import { InspectionRoundService } from './inspection_round.service';

describe('InspectionRoundController', () => {
  let controller: InspectionRoundController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionRoundController],
      providers: [InspectionRoundService],
    }).compile();

    controller = module.get<InspectionRoundController>(InspectionRoundController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
