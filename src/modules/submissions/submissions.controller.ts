// src/modules/submissions/submissions.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Query, Header } from '@nestjs/common';
import { GetSubmissionsFilterDto } from './dto/get-submissions-filter.dto';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) { }

  /**
   * Create or update a submission
   * POST /submissions
   */
  @Post()
  @Roles('student')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 52428800, // 50MB
    },
  }))
  async createSubmission(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateSubmissionDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.submissionsService.createSubmission(dto, file, userId);
  }

  /**
   * Get status summary for polling (lightweight)
   * GET /submissions/status-summary
   * Returns only the count of IN_PROGRESS submissions
   */
  @Get('status-summary')
  @Roles('admin', 'instructor')
  async getStatusSummary() {
    return this.submissionsService.getStatusSummary();
  }

  /**
   * Get submissions by group
   * GET /submissions/group/:groupId
   */
  @Get('group/:groupId')
  @Roles('student', 'instructor', 'admin')
  async getSubmissionsByGroup(@Param('groupId') groupId: string) {
    return this.submissionsService.getSubmissionsByGroup(groupId);
  }

  /**
   * Get submission by ID
   * GET /submissions/:id
   */
  @Get(':id')
  @Roles('student', 'instructor', 'admin')
  async getSubmissionById(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.getSubmissionById(id);
  }

  /**
   * Get file download URL
   * Post /submissions/:id/file
   */
  @Post(':id/file')  // ปลี่ยน @Get เป็น @Post
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate') // สั่งห้าม Cache
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Roles('student', 'instructor', 'admin')
  async getFileUrl(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.getFileUrl(id);
  }

  /**
   * Get ALL submissions
   * GET /submissions
   */
  @Get()
  @Roles('admin', 'instructor')
  async getAllSubmissions(@Query() filterDto: GetSubmissionsFilterDto) {
    return this.submissionsService.getAllSubmissions(filterDto);
  }

  @Patch(':id/comment')
  @Roles('instructor', 'admin')
  async updateComment(
    @Param('id', ParseIntPipe) id: number,
    @Body('comment') comment: string,
  ) {
    return this.submissionsService.updateComment(id, comment);
  }

  @Post(':id/verify')
  @Roles('admin', 'instructor')
  async verifySubmission(@Param('id', ParseIntPipe) id: number) {
    // เรียก Logic การส่งตรวจ หรือ update status
    return this.submissionsService.sendToVerificationSystem(id);
  }
}
