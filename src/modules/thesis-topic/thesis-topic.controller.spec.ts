import { Test, TestingModule } from '@nestjs/testing';
import { ThesisTopicController } from './thesis-topic.controller';
import { ThesisTopicService } from './thesis-topic.service';

describe('ThesisTopicController', () => {
  let controller: ThesisTopicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThesisTopicController],
      providers: [ThesisTopicService],
    }).compile();

    controller = module.get<ThesisTopicController>(ThesisTopicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
