import { Test, TestingModule } from '@nestjs/testing';
import { DocConfigService } from './doc-config.service';

describe('DocConfigService', () => {
  let service: DocConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocConfigService],
    }).compile();

    service = module.get<DocConfigService>(DocConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
