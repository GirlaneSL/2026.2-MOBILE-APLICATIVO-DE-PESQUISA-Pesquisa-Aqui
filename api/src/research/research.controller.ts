import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards, Headers } from '@nestjs/common';
import { ResearchService } from './research.service.js';
import { CreateResearchDto } from './dto/create-research.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';

@UseGuards(AuthGuard)
@Controller('research')
export class ResearchController {
    constructor(private researchService: ResearchService) { }

    @Post()
    create(@Body() createResearchDto: CreateResearchDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.create(createResearchDto, currentUser);
    }

    @Get()
    findAll(@CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.findAll(currentUser);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.findOne(id, currentUser);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateResearchDto: UpdateResearchDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.update(id, updateResearchDto, currentUser)
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.delete(id, currentUser);
    }

    @Get(':id/download')
    async download(
        @Param('id', ParseIntPipe) id: number,
        @Headers('x-device-id') deviceId: string,
    ) {
        const safeDeviceId = deviceId || 'unknown-device';
        return this.researchService.downloadPackage(id, safeDeviceId);
    }

}
