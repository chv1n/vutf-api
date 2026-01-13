import { Test, TestingModule } from '@nestjs/testing';
import { ThesisTopicService } from './thesis-topic.service';

describe('ThesisTopicService', () => {
  let service: ThesisTopicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThesisTopicService],
    }).compile();

    service = module.get<ThesisTopicService>(ThesisTopicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
