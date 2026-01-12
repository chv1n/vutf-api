import {
  Controller,
  Get,
  Post,
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
   * GET /submissions/:id/file
   */
  @Get(':id/file')
  @Roles('student', 'instructor', 'admin')
  async getFileUrl(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.getFileUrl(id);
  }
}
