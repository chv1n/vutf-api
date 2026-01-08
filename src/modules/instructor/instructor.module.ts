import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorService } from './instructor.service';
import { InstructorController } from './instructor.controller';
import { UserAccount } from '../users/entities/user-account.entity';
import { Instructor } from '../users/entities/instructor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccount, Instructor]),
  ],
  controllers: [InstructorController],
  providers: [InstructorService],
  exports: [InstructorService],
})
export class InstructorModule {}