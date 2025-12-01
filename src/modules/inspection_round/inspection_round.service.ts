import { Injectable } from '@nestjs/common';
import { CreateInspectionRoundDto } from './dto/create-inspection_round.dto';
import { UpdateInspectionRoundDto } from './dto/update-inspection_round.dto';

@Injectable()
export class InspectionRoundService {
  create(createInspectionRoundDto: CreateInspectionRoundDto) {
    return 'This action adds a new inspectionRound';
  }

  findAll() {
    return `This action returns all inspectionRound`;
  }

  findOne(id: number) {
    return `This action returns a #${id} inspectionRound`;
  }

  update(id: number, updateInspectionRoundDto: UpdateInspectionRoundDto) {
    return `This action updates a #${id} inspectionRound`;
  }

  remove(id: number) {
    return `This action removes a #${id} inspectionRound`;
  }
}
