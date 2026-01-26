import { Test, TestingModule } from '@nestjs/testing';
import { ClassSectionsController } from './class-sections.controller';
import { ClassSectionsService } from './class-sections.service';

describe('ClassSectionsController', () => {
  let controller: ClassSectionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassSectionsController],
      providers: [ClassSectionsService],
    }).compile();

    controller = module.get<ClassSectionsController>(ClassSectionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
