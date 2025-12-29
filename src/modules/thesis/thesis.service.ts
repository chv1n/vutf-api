import { Injectable } from '@nestjs/common';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { Thesis } from './entities/thesis.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class ThesisService {
  constructor() {}

  async createThesis(
    manager: EntityManager,
    dto: CreateThesisDto,
  ): Promise<Thesis> {
    const thesis = manager.create(Thesis, { ...dto });
    return await manager.save(thesis);
  }
}
