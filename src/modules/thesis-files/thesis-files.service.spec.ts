import { Test, TestingModule } from '@nestjs/testing';
import { ThesisFilesService } from './thesis-files.service';

describe('ThesisFilesService', () => {
  let service: ThesisFilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThesisFilesService],
    }).compile();

    service = module.get<ThesisFilesService>(ThesisFilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
