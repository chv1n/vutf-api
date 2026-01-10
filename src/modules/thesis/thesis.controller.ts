// src/modules/thesis/thesis.controller.ts
import { Controller, UseGuards, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ThesisService } from './thesis.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { UpdateThesisDto } from './dto/update-thesis.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('thesis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThesisController {
    constructor(private readonly thesisService: ThesisService) { }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateThesisDto: UpdateThesisDto) {
        return this.thesisService.updateThesis(id, updateThesisDto);
    }

    @Delete(':id')
    @Roles('admin')
    remove(@Param('id') id: string) {
        return this.thesisService.removeThesis(id);
    }
}
