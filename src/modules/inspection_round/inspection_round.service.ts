// src/modules/inspection_round/inspection_round.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, LessThan, ILike, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateInspectionRoundDto } from './dto/create-inspection_round.dto';
import { UpdateInspectionRoundDto } from './dto/update-inspection_round.dto';
import { GetInspectionRoundsQueryDto } from './dto/get-inspection-rounds-query.dto';
import { CourseType, InspectionRound, InspectionStatus } from './entities/inspection_round.entity';
import { Thesis } from '../thesis/entities/thesis.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class InspectionRoundService {
  constructor(
    @InjectRepository(InspectionRound)
    private readonly inspectionRoundRepository: Repository<InspectionRound>,
    @InjectRepository(Thesis)
    private readonly thesisRepository: Repository<Thesis>,

    private readonly notificationsService: NotificationsService,
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

    // ---------------------------------------------------------
    // 1. หา Rounds ที่ถึงเวลาเปิด (CLOSED -> OPEN)
    // ---------------------------------------------------------
    const roundsToOpen = await this.inspectionRoundRepository.find({
      where: {
        status: InspectionStatus.CLOSED,
        startDate: LessThanOrEqual(now),
        endDate: MoreThan(now),
        isActive: true,
        isManualClosed: false
      }
    });

    // วนลูปเพื่อเปิดสถานะ และส่งแจ้งเตือน
    if (roundsToOpen.length > 0) {
      console.log(`[Cron] Opening ${roundsToOpen.length} rounds...`);

      for (const round of roundsToOpen) {
        // 1. อัปเดตสถานะ
        round.status = InspectionStatus.OPEN;
        await this.inspectionRoundRepository.save(round);

        // 2. รียก Notification
        console.log(`[Cron] Sending notification for round #${round.inspectionId}`);
        await this.notifyStudentsForNewRound(round);
      }
    }

    // ---------------------------------------------------------
    // 2. ปิด Rounds ที่หมดเวลา (OPEN -> CLOSED)
    // ---------------------------------------------------------
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

    const savedRound = await this.inspectionRoundRepository.save(newRound);

    // 3. ✅ ส่งแจ้งเตือนหานักศึกษา (ถ้าสถานะเปิดใช้งาน)
    // เช็ค isActive และ status (เผื่อสร้างแล้วปิดเลยก็ไม่ต้องแจ้ง)
    if (savedRound.isActive && savedRound.status === InspectionStatus.OPEN) {
      await this.notifyStudentsForNewRound(savedRound);
    }

    return savedRound;
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
    const oldStatus = existingRound.status;

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
    const updatedRound = await this.findOne(id);

    const isJustOpened = updatedRound.status === InspectionStatus.OPEN && updatedRound.isActive;
    const wasClosedOrInactive = oldStatus !== InspectionStatus.OPEN || !existingRound.isActive;

    if (isJustOpened && wasClosedOrInactive) {
      console.log(`[Manual Update] Round #${id} changed to OPEN. Sending notifications...`);
      await this.notifyStudentsForNewRound(updatedRound);
    }

    return updatedRound;
  }

  async toggleStatus(id: number): Promise<InspectionRound> {
    const round = await this.findOne(id);

    if (round.status === InspectionStatus.OPEN) {
      round.status = InspectionStatus.CLOSED;
      round.isManualClosed = true;
      return await this.inspectionRoundRepository.save(round);
    } else {
      round.status = InspectionStatus.OPEN;
      round.isManualClosed = false;
      const savedRound = await this.inspectionRoundRepository.save(round);

      await this.notifyStudentsForNewRound(savedRound);

      return savedRound;
    }
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

    // 1. ถ้าส่ง ID มาโดยตรง ให้ใช้ ID นั้นทันที (แม่นยำที่สุด)
    if (inspectionId) {
      return await this.inspectionRoundRepository.findOne({ where: { inspectionId } });
    }

    // 2. ถ้ามีการส่งเงื่อนไขการกรองมา (อย่างใดอย่างหนึ่ง หรือทั้งหมด)
    // ให้พยายามหารอบที่ตรงกับเงื่อนไขนั้นๆ ที่สุด โดยเอาอันล่าสุดมา
    if (academicYear || term || roundNumber) {
      const whereClause: any = {};
      if (academicYear) whereClause.academicYear = academicYear;
      if (term) whereClause.term = term;
      if (roundNumber) whereClause.roundNumber = Number(roundNumber);

      const match = await this.inspectionRoundRepository.findOne({
        where: whereClause,
        order: { academicYear: 'DESC', term: 'DESC', roundNumber: 'DESC' }
      });

      if (match) return match;
    }

    // 3. กรณีไม่ได้ส่ง Filter อะไรมาเลย หรือหาตาม Filter ไม่เจอ (Default Landing Page)
    // หาตัวที่ OPEN และ Active อยู่
    let round = await this.inspectionRoundRepository.findOne({
      where: { status: InspectionStatus.OPEN, isActive: true },
      order: { endDate: 'ASC' },
    });

    // 4. สุดท้ายจริงๆ ถ้าไม่มีอะไรเปิดอยู่เลย ให้เอารอบล่าสุดที่เคยสร้างขึ้นมา
    if (!round) {
      round = await this.inspectionRoundRepository.findOne({
        where: {},
        order: { createAt: 'DESC' }
      });
    }

    return round;
  }

  async getAvailableRoundsForGroup(groupId: string): Promise<InspectionRound[]> {
    // 1. ดึงข้อมูล Thesis ของกลุ่มนี้
    const thesis = await this.thesisRepository.createQueryBuilder('thesis')
      .leftJoin('thesis_group', 'group', 'group.thesis_id = thesis.thesis_id')
      .where('group.group_id = :groupId', { groupId })
      .getOne();

    if (!thesis) {
      return []; // หรือ throw new NotFoundException('ไม่พบข้อมูลโครงงาน');
    }

    // 2. ถ้าโครงงานผ่านแล้ว (PASSED) ไม่ต้องแสดงรอบส่ง
    if (thesis.status === 'PASSED') {
      return [];
    }

    // 3. ค้นหารอบที่เข้าเงื่อนไข (ปี/เทอมตรงกัน และ CourseType ตรงกัน หรือเป็น ALL)
    const activeRounds = await this.inspectionRoundRepository.find({
      where: [
        {
          status: InspectionStatus.OPEN,
          isActive: true,
          academicYear: String(thesis.start_academic_year),
          term: String(thesis.start_term),
          courseType: thesis.course_type as unknown as CourseType,
        },
        {
          status: InspectionStatus.OPEN,
          isActive: true,
          academicYear: String(thesis.start_academic_year),
          term: String(thesis.start_term),
          courseType: CourseType.ALL,
        }
      ],
      order: { endDate: 'ASC' } // แสดงรอบที่ใกล้หมดเวลาก่อน
    });

    return activeRounds;
  }

  async getAvailableRoundsForUser(userId: string): Promise<InspectionRound[]> {
    const studentGroup = await this.thesisRepository.manager.createQueryBuilder()
      .select('member.group_id', 'groupId')
      .from('group_members', 'member')
      .innerJoin('student', 'student', 'student.student_uuid = member.student_uuid')
      .where('student.user_uuid = :userId', { userId })
      .getRawOne();

    // console.log('🔍 [Service] Found studentGroup:', studentGroup);

    if (!studentGroup || !studentGroup.groupId) {
      console.log('❌ [Service] ไม่พบกลุ่มของนักศึกษาคนนี้ รีเทิร์น []');
      return [];
    }

    return this.getAvailableRoundsForGroup(studentGroup.groupId);
  }

  // =================================================================
  // NOTIFICATION LOGIC
  // =================================================================
  private async notifyStudentsForNewRound(round: InspectionRound) {
    try {
      const qb = this.thesisRepository.createQueryBuilder('thesis')
        // Join Tables
        .leftJoin('thesis_group', 'group', 'group.thesis_id = thesis.thesis_id')
        .leftJoin('group_members', 'member', 'member.group_id = group.group_id')
        .leftJoin('student', 'student', 'student.student_uuid = member.student_uuid')

        // Filter: ปี/เทอม ตรงกับรอบตรวจ
        .where('thesis.start_academic_year = :year', { year: round.academicYear })
        .andWhere('thesis.start_term = :term', { term: round.term })

        .andWhere('thesis.status = :status', { status: 'IN_PROGRESS' })

        // Select UserID
        .select('student.user_uuid', 'userId')
        .distinct(true);

      // Filter Course Type
      if (round.courseType !== 'ALL') {
        qb.andWhere('thesis.course_type = :courseType', { courseType: round.courseType });
      }

      const targets = await qb.getRawMany();
      console.log(`[Notification] Found ${targets.length} students (IN_PROGRESS) for new round.`);

      const notifications = targets.map(target => {
        if (!target.userId) return Promise.resolve();

        return this.notificationsService.createAndSend(
          target.userId,
          NotificationType.SYSTEM_ANNOUNCE,
          `เปิดรอบส่งงานใหม่: รอบที่ ${round.roundNumber}`,
          `เปิดรับส่งงาน ${round.title} (ปีการศึกษา ${round.academicYear}/${round.term}) หมดเขต ${new Date(round.endDate).toLocaleDateString('th-TH')}`,
          {
            url: '/student/inspections',
            inspectionId: round.inspectionId
          }
        );
      });

      await Promise.all(notifications);

    } catch (error) {
      console.error('Error sending notifications for new round:', error);
    }
  }
}