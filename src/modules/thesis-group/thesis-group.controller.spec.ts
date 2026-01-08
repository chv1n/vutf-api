import { Test, TestingModule } from '@nestjs/testing';
import { ThesisGroupController } from './thesis-group.controller';
import { ThesisGroupService } from './thesis-group.service';

describe('ThesisGroupController', () => {
  let controller: ThesisGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThesisGroupController],
      providers: [ThesisGroupService],
    }).compile();

    controller = module.get<ThesisGroupController>(ThesisGroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
