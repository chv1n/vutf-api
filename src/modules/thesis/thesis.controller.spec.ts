import { Test, TestingModule } from '@nestjs/testing';
import { ThesisController } from './thesis.controller';
import { ThesisService } from './thesis.service';

describe('ThesisController', () => {
  let controller: ThesisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThesisController],
      providers: [ThesisService],
    }).compile();

    controller = module.get<ThesisController>(ThesisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
