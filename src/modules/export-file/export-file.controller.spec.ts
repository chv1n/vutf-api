import { Test, TestingModule } from '@nestjs/testing';
import { ExportFileController } from './export-file.controller';
import { ExportFileService } from './export-file.service';

describe('ExportFileController', () => {
  let controller: ExportFileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportFileController],
      providers: [ExportFileService],
    }).compile();

    controller = module.get<ExportFileController>(ExportFileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
