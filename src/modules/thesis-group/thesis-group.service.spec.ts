import { Test, TestingModule } from '@nestjs/testing';
import { ThesisGroupService } from './thesis-group.service';

describe('ThesisGroupService', () => {
  let service: ThesisGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThesisGroupService],
    }).compile();

    service = module.get<ThesisGroupService>(ThesisGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
