import { Test, TestingModule } from '@nestjs/testing';
import { ExportFileService } from './export-file.service';

describe('ExportFileService', () => {
  let service: ExportFileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportFileService],
    }).compile();

    service = module.get<ExportFileService>(ExportFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
