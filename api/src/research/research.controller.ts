import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards, Headers } from '@nestjs/common';
import { ResearchService } from './research.service.js';
import { CreateResearchDto } from './dto/create-research.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';
import { LinkResearcherDto } from './dto/link-researcher.dto.js';
import { UpdateResearcherTargetDto } from './dto/update-researcher-target.dto.js';

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
        return this.researchService.findOneWithLock(id, currentUser);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateResearchDto: UpdateResearchDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.update(id, updateResearchDto, currentUser)
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.delete(id, currentUser);
    }

    @Post(':id/publish')
    publish(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.publish(id, currentUser);
    }

    @Get(':id/researchers')
    listResearchers(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.listResearchers(id, currentUser);
    }

    @Post(':id/researchers/:userId')
    addResearcher(
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number,
        @Body() body: LinkResearcherDto,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.addResearcher(id, userId, currentUser, body?.targetCount);
    }

    @Patch(':id/researchers/:userId')
    updateResearcherTarget(
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number,
        @Body() body: UpdateResearcherTargetDto,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.updateResearcherTarget(id, userId, body.targetCount, currentUser);
    }

    @Delete(':id/researchers/:userId')
    removeResearcher(
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.removeResearcher(id, userId, currentUser);
    }

    @Get(':id/download')
    download(
        @Param('id', ParseIntPipe) id: number,
        @Headers('x-device-id') deviceId: string,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.downloadPackage(id, deviceId || 'unknown-device', currentUser);
    }
}
