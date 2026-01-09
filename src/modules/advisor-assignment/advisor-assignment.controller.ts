// src/modules/advisor-assignment/advisor-assignment.controller.ts
import {
    Controller,
    UseGuards,
    Req,
    Param,
    Body,
    Post,
    Put,
    Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdvisorAssignmentService } from './advisor-assignment.service';
import { AddAdvisorDto } from './dto/add-advisor.dto';
import { UpdateAdvisorDto } from './dto/update-advisor.dto';

@Controller('advisor')
export class AdvisorAssignmentController {
    constructor(private readonly advisorService: AdvisorAssignmentService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('/:groupId')
    async addAdvisor(
        @Req() req,
        @Param('groupId') groupId: string,
        @Body() dto: AddAdvisorDto,
    ) {
        return this.advisorService.addAdvisor(req.user.userId, groupId, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('/:groupId/:advisorId')
    async updateAdvisor(
        @Req() req,
        @Param('groupId') groupId: string,
        @Param('advisorId') advisorId: string,
        @Body() dto: UpdateAdvisorDto,
    ) {
        return this.advisorService.updateAdvisor(
            req.user.userId,
            groupId,
            advisorId,
            dto,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('/:groupId/:advisorId')
    async removeAdvisor(
        @Req() req,
        @Param('groupId') groupId: string,
        @Param('advisorId') advisorId: string,
    ) {
        return this.advisorService.removeAdvisor(
            req.user.userId,
            groupId,
            advisorId,
        );
    }
}
