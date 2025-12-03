import { Test, TestingModule } from '@nestjs/testing';
import { InspectionRoundService } from './inspection_round.service';

describe('InspectionRoundService', () => {
  let service: InspectionRoundService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InspectionRoundService],
    }).compile();

    service = module.get<InspectionRoundService>(InspectionRoundService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
