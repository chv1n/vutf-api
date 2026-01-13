import { Test, TestingModule } from '@nestjs/testing';
import { ClassSectionsService } from './class-sections.service';

describe('ClassSectionsService', () => {
  let service: ClassSectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassSectionsService],
    }).compile();

    service = module.get<ClassSectionsService>(ClassSectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
