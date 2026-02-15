import { Module } from '@nestjs/common';
import { ThesisService } from './thesis.service';
import { ThesisController } from './thesis.controller';
import { Thesis } from './entities/thesis.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThesisGroupModule } from '../thesis-group/thesis-group.module';
import { ThesisDocument } from './entities/thesis-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Thesis, ThesisDocument]),
  ],
  controllers: [ThesisController],
  providers: [ThesisService],
  exports: [ThesisService],
})
export class ThesisModule { }
