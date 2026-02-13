import { Test, TestingModule } from '@nestjs/testing';
import { TrackThesisController } from './track-thesis.controller';
import { TrackThesisService } from './track-thesis.service';

describe('TrackThesisController', () => {
  let controller: TrackThesisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackThesisController],
      providers: [TrackThesisService],
    }).compile();

    controller = module.get<TrackThesisController>(TrackThesisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
