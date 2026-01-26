import { Test, TestingModule } from '@nestjs/testing';
import { DocConfigController } from './doc-config.controller';
import { DocConfigService } from './doc-config.service';

describe('DocConfigController', () => {
  let controller: DocConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocConfigController],
      providers: [DocConfigService],
    }).compile();

    controller = module.get<DocConfigController>(DocConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
