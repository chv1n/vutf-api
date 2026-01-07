import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ThesisService } from './thesis.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { UpdateThesisDto } from './dto/update-thesis.dto';

@Controller('thesis')
export class ThesisController {
    constructor(private readonly thesisService: ThesisService) { }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateThesisDto: UpdateThesisDto) {
        return this.thesisService.updateThesis(id, updateThesisDto);
    }
}
