import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInspectionRoundDto } from './dto/create-inspection_round.dto';
import { UpdateInspectionRoundDto } from './dto/update-inspection_round.dto';
import { InspectionRound } from './entities/inspection_round.entity';

@Injectable()
export class InspectionRoundService {
  constructor(
    @InjectRepository(InspectionRound)
    private readonly inspectionRoundRepository: Repository<InspectionRound>,
  ) { }

  async findAll(): Promise<InspectionRound[]> {
    return await this.inspectionRoundRepository.find({
      order: {
        createAt: 'DESC',
      },
    });
  }

  async create(createDto: CreateInspectionRoundDto): Promise<InspectionRound> {
    const { title, description, startDate, endDate } = createDto;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Custom Validation: StartDate ห้ามมากกว่า EndDate
    if (start > end) {
      throw new BadRequestException('Start date cannot be later than End date');
    }

    // Prepare Entity
    const newRound = this.inspectionRoundRepository.create({
      title,
      description,
      startDate: start,
      endDate: end,
      // status จะเป็น default 'OPEN' จาก Entity
    });

    // Save to Database
    return await this.inspectionRoundRepository.save(newRound);
  }

  // ฟังก์ชันหาข้อมูลตาม ID (ใช้เป็น Helper)
  async findOne(id: number): Promise<InspectionRound> {
    const round = await this.inspectionRoundRepository.findOne({
      where: { inspectionId: id },
    });
    if (!round) {
      throw new NotFoundException(`ไม่พบรอบการตรวจรหัส #${id}`);
    }
    return round;
  }

  async update(id: number, updateDto: UpdateInspectionRoundDto): Promise<InspectionRound> {
    // ดึงข้อมูลเก่ามาก่อน
    const existingRound = await this.findOne(id);

    // รวมข้อมูลเก่า เข้ากับข้อมูลใหม่ที่ส่งมา (Merge)
    const updatedData = { ...existingRound, ...updateDto };

    // ถ้ามีการแก้เวลา ต้องเช็ค Validation ใหม่
    if (updateDto.startDate || updateDto.endDate) {
      const start = new Date(updatedData.startDate); // ใช้ข้อมูลที่ Merge แล้วมาเช็ค
      const end = new Date(updatedData.endDate);

      if (start > end) {
        throw new BadRequestException('วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด');
      }
    }

    await this.inspectionRoundRepository.update(id, {
      ...updateDto,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : existingRound.startDate,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : existingRound.endDate,
    });

    return this.findOne(id); // Return ค่าล่าสุดกลับไป
  }

  async remove(id: number): Promise<{ message: string }> {
    const round = await this.findOne(id); // เช็คก่อนว่ามีไหม
    await this.inspectionRoundRepository.remove(round);
    return { message: `ลบรอบการตรวจรหัส #${id} สำเร็จ` };
  }
}