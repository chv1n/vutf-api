import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorAssignmentService } from './advisor-assignment.service';

describe('AdvisorAssignmentService', () => {
  let service: AdvisorAssignmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvisorAssignmentService],
    }).compile();

    service = module.get<AdvisorAssignmentService>(AdvisorAssignmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
