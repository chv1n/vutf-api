// src/modules/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, UseGuards, Request, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  async getMyNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.notificationsService.findAllByUser(req.user.userId, +page, +limit);
  }

  @Get('recent')
  async getRecentNotifications(@Request() req) {
    return this.notificationsService.findRecent(req.user.userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  async markAllRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Post('test/:userId')
  async testNotify(@Param('userId') userId: string) {
    return this.notificationsService.createAndSend(
      userId,
      'submission_status' as any,
      'ทดสอบแจ้งเตือน6',
      'ระบบ Socket ของคุณใช้งานได้แล้ว!',
      { url: '/dashboard' }
    );
  }
}