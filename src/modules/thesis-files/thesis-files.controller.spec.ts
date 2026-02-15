import { Test, TestingModule } from '@nestjs/testing';
import { ThesisFilesController } from './thesis-files.controller';
import { ThesisFilesService } from './thesis-files.service';

describe('ThesisFilesController', () => {
  let controller: ThesisFilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThesisFilesController],
      providers: [ThesisFilesService],
    }).compile();

    controller = module.get<ThesisFilesController>(ThesisFilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
