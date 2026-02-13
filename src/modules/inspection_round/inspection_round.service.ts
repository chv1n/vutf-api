// src/modules/inspection_round/inspection_round.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, LessThan, ILike, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateInspectionRoundDto } from './dto/create-inspection_round.dto';
import { UpdateInspectionRoundDto } from './dto/update-inspection_round.dto';
import { GetInspectionRoundsQueryDto } from './dto/get-inspection-rounds-query.dto';
import { InspectionRound, InspectionStatus } from './entities/inspection_round.entity';

@Injectable()
export class InspectionRoundService {
  constructor(
    @InjectRepository(InspectionRound)
    private readonly inspectionRoundRepository: Repository<InspectionRound>,
  ) { }

  private toUtcFromThai(date: Date | string): Date {
    const d = new Date(date);
    d.setHours(d.getHours() - 7);
    return d;
  }

  // =================================================================
  // AUTOMATION (Cron Job)
  // =================================================================
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoStatusUpdate() {
    const now = new Date();

    await this.inspectionRoundRepository.update(
      {
        status: InspectionStatus.CLOSED,
        startDate: LessThanOrEqual(now),
        endDate: MoreThan(now),
        isActive: true,
        isManualClosed: false
      },
      { status: InspectionStatus.OPEN }
    );

    await this.inspectionRoundRepository.update(
      {
        status: InspectionStatus.OPEN,
        endDate: LessThan(now),
        isActive: true
      },
      {
        status: InspectionStatus.CLOSED,
        isManualClosed: false
      }
    );
  }

  // =================================================================
  // CRUD
  // =================================================================

  async findAll(query: GetInspectionRoundsQueryDto): Promise<{ data: InspectionRound[], meta: any }> {
    const {
      page = 1,
      limit = 10,
      search,
      academicYear,
      term,
      roundNumber,
      courseType
    } = query;

    const skip = (page - 1) * limit;

    const baseCondition: any = { isActive: true };

    if (academicYear) baseCondition.academicYear = academicYear;
    if (term) baseCondition.term = term;
    if (roundNumber) baseCondition.roundNumber = Number(roundNumber);
    if (courseType && courseType !== 'ALL') baseCondition.courseType = courseType;

    let whereCondition: any;

    if (search) {
      whereCondition = [
        { ...baseCondition, title: ILike(`%${search}%`) },
        { ...baseCondition, description: ILike(`%${search}%`) }
      ];
    } else {
      whereCondition = baseCondition;
    }

    const [data, total] = await this.inspectionRoundRepository.findAndCount({
      where: whereCondition,
      order: {
        createAt: 'DESC',
      },
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit
      }
    };
  }

  async findAllActive(): Promise<InspectionRound[]> {
    return await this.inspectionRoundRepository.find({
      where: { status: InspectionStatus.OPEN, isActive: true },
      order: { createAt: 'DESC' },
    });
  }

  async create(createDto: CreateInspectionRoundDto): Promise<InspectionRound> {
    const {
      title, description, startDate, endDate,
      academicYear, term, roundNumber, courseType,
      status, isActive
    } = createDto;

    const existingRound = await this.inspectionRoundRepository.findOne({
      where: {
        academicYear,
        term,
        roundNumber,
        courseType,
        isActive: true,
      },
    });

    if (existingRound) {
      throw new BadRequestException(
        `รอบการส่งนี้มีอยู่แล้ว: ปี ${academicYear} เทอม ${term} รอบที่ ${roundNumber} (${courseType})`
      );
    }

    const startUTC = this.toUtcFromThai(startDate);
    const endUTC = this.toUtcFromThai(endDate);

    if (startUTC > endUTC) {
      throw new BadRequestException('Start date cannot be later than End date');
    }

    const newRound = this.inspectionRoundRepository.create({
      academicYear,
      term,
      roundNumber,
      courseType,
      title,
      description,
      startDate: startUTC,
      endDate: endUTC,
      status: status || InspectionStatus.CLOSED,
      isActive: isActive ?? true,
    });

    return await this.inspectionRoundRepository.save(newRound);
  }

  async findOne(id: number): Promise<InspectionRound> {
    const round = await this.inspectionRoundRepository.findOne({
      where: { inspectionId: id, isActive: true },
    });
    if (!round) throw new NotFoundException(`ไม่พบรอบการตรวจรหัส #${id}`);
    return round;
  }

  async update(id: number, updateDto: UpdateInspectionRoundDto): Promise<InspectionRound> {
    const existingRound = await this.findOne(id);

    const updateData: any = { ...updateDto };

    const checkYear = updateDto.academicYear ?? existingRound.academicYear;
    const checkTerm = updateDto.term ?? existingRound.term;
    const checkRoundNumber = updateDto.roundNumber ?? existingRound.roundNumber;
    const checkCourseType = updateDto.courseType ?? existingRound.courseType;

    const duplicateCheck = await this.inspectionRoundRepository.findOne({
      where: {
        academicYear: checkYear,
        term: checkTerm,
        roundNumber: checkRoundNumber,
        courseType: checkCourseType,
        isActive: true,
        inspectionId: Not(id),
      },
    });

    if (duplicateCheck) {
      throw new BadRequestException(
        `ไม่สามารถแก้ไขได้: ข้อมูลปี ${checkYear} เทอม ${checkTerm} รอบที่ ${checkRoundNumber} (${checkCourseType}) มีอยู่แล้วในรายการอื่น`
      );
    }

    if (updateDto.startDate) {
      updateData.startDate = this.toUtcFromThai(updateDto.startDate);
    }
    if (updateDto.endDate) {
      updateData.endDate = this.toUtcFromThai(updateDto.endDate);
    }

    const startToCheck = updateData.startDate || existingRound.startDate;
    const endToCheck = updateData.endDate || existingRound.endDate;

    if (new Date(startToCheck) > new Date(endToCheck)) {
      throw new BadRequestException('Start date cannot be later than End date');
    }

    await this.inspectionRoundRepository.update(id, updateData);
    return this.findOne(id);
  }

  async toggleStatus(id: number): Promise<InspectionRound> {
    const round = await this.findOne(id);
    if (round.status === InspectionStatus.OPEN) {
      round.status = InspectionStatus.CLOSED;
      round.isManualClosed = true;
    } else {
      round.status = InspectionStatus.OPEN;
      round.isManualClosed = false;
    }
    return await this.inspectionRoundRepository.save(round);
  }

  async remove(id: number): Promise<{ message: string }> {
    const round = await this.findOne(id);
    if (round.status === InspectionStatus.OPEN) {
      throw new BadRequestException('ไม่สามารถลบได้เนื่องจากสถานะเปิดอยู่');
    }
    round.isActive = false;
    await this.inspectionRoundRepository.save(round);
    return { message: `Success` };
  }

  /**
   * ดึงเฉพาะรอบที่ "เปิดอยู่ (OPEN)" และ "Active"
   * เอาไว้ทำ Dropdown ให้ Admin เลือก
   */
  async getActiveRoundsForDropdown() {
    const activeRounds = await this.inspectionRoundRepository.find({
      where: {
        status: InspectionStatus.OPEN, 
        isActive: true,               
      },
      order: {
        academicYear: 'DESC', 
        term: 'DESC',         
        roundNumber: 'DESC', 
      },
      select: [
        'inspectionId',
        'academicYear',
        'term',
        'roundNumber',
        'courseType',
        'endDate',
        'title'
      ]
    });

    // Format ข้อมูลให้ Frontend เอาไปใช้ง่ายๆ
    return activeRounds.map(round => ({
      id: round.inspectionId,
      label: `ปี ${round.academicYear}/${round.term} รอบที่ ${round.roundNumber}: ${round.title}`,
      value: round.inspectionId,
      type: round.courseType,
      deadline: round.endDate
    }));
  }

  async resolveTargetRound(
    filters: { inspectionId?: number; academicYear?: string; term?: string; roundNumber?: number }
  ): Promise<InspectionRound | null> {
    const { inspectionId, academicYear, term, roundNumber } = filters;

    if (academicYear && term && roundNumber) {
      return await this.inspectionRoundRepository.findOne({
        where: { academicYear, term, roundNumber: Number(roundNumber) },
      });
    }

    if (inspectionId) {
      return await this.inspectionRoundRepository.findOne({ where: { inspectionId } });
    }

    // Default: หา Active หรือ ล่าสุด
    let round = await this.inspectionRoundRepository.findOne({
      where: { status: InspectionStatus.OPEN, isActive: true },
      order: { endDate: 'ASC' }, // หรือ DESC 
    });

    if (!round) {
      round = await this.inspectionRoundRepository.findOne({ order: { createAt: 'DESC' } });
    }

    return round;
  }
}