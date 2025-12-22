import { Controller } from '@nestjs/common';
import { ThesisGroupService } from './thesis_group.service';

@Controller('thesis-group')
export class ThesisGroupController {
  constructor(private readonly thesisGroupService: ThesisGroupService) {}
}
