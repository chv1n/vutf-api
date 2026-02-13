import { Test, TestingModule } from '@nestjs/testing';
import { TrackThesisService } from './track-thesis.service';

describe('TrackThesisService', () => {
  let service: TrackThesisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrackThesisService],
    }).compile();

    service = module.get<TrackThesisService>(TrackThesisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
