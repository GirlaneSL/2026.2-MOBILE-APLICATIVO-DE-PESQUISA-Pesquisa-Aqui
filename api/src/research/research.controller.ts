import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards, Headers, Header, Query, StreamableFile } from '@nestjs/common';
import { ResearchService } from './research.service.js';
import { ResearchReportService } from './research-report.service.js';
import { CreateResearchDto } from './dto/create-research.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';
import { LinkResearcherDto } from './dto/link-researcher.dto.js';
import { UpdateResearcherTargetDto } from './dto/update-researcher-target.dto.js';
import { RevokeCopyDto } from './dto/revoke-copy.dto.js';

@UseGuards(AuthGuard)
@Controller('research')
export class ResearchController {
    constructor(private researchService: ResearchService, private reportService: ResearchReportService) { }

    @Post()
    create(@Body() createResearchDto: CreateResearchDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.create(createResearchDto, currentUser);
    }

    // O aplicativo envia `X-Device-ID`: para o pesquisador, cada pesquisa volta com `copyStatus` (a cópia deste aparelho).
    @Get()
    findAll(@Headers('x-device-id') deviceId: string | undefined, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.findAll(currentUser, deviceId?.trim() || undefined);
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

    // Encerrar: bloqueia coleta nova e congela o resultado. Só administrador.
    @Post(':id/close')
    @HttpCode(200)
    close(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.close(id, currentUser);
    }

    // Painel quase em tempo real (total, por pesquisador, meta, última sincronização, tempo médio). Filtros: from, to, researcherId.
    @Get(':id/panel')
    @Header('Cache-Control', 'private, no-store')
    panel(@Param('id', ParseIntPipe) id: number, @Query() query: ReportQueryDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.reportService.panel(id, toReportQuery(query), currentUser);
    }

    // Relatório: um gráfico por questão de escolha e sim/não, com os mesmos filtros do painel.
    @Get(':id/report')
    @Header('Cache-Control', 'private, no-store')
    report(@Param('id', ParseIntPipe) id: number, @Query() query: ReportQueryDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.reportService.report(id, toReportQuery(query), currentUser);
    }

    // CSV com uma linha por coleta e uma coluna por questão, com os mesmos filtros.
    @Get(':id/export.csv')
    @Header('Cache-Control', 'private, no-store')
    @Header('X-Content-Type-Options', 'nosniff')
    async exportCsv(@Param('id', ParseIntPipe) id: number, @Query() query: ReportQueryDto, @CurrentUser() currentUser: UserPayLoad) {
        const { fileName, content } = await this.reportService.exportCsv(id, toReportQuery(query), currentUser);
        return new StreamableFile(Buffer.from(content, 'utf8'), {
            type: 'text/csv; charset=utf-8',
            disposition: `attachment; filename="${fileName}"`,
        });
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

    // Quem está com a pesquisa baixada (cópias ativas + histórico de devoluções e revogações). Só administrador.
    @Get(':id/copies')
    listCopies(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.researchService.listCopies(id, currentUser);
    }

    // Revogação forçada de uma cópia (aparelho perdido, quebrado, pesquisador que saiu). Só administrador.
    @Post(':id/copies/:copyId/revoke')
    @HttpCode(200)
    revokeCopy(
        @Param('id', ParseIntPipe) id: number,
        @Param('copyId', ParseIntPipe) copyId: number,
        @Body() body: RevokeCopyDto,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.revokeActiveCopy(id, copyId, body?.reason, currentUser);
    }

    // Desbloquear aparelho: desfaz a revogação para o aparelho voltar a baixar a pesquisa. Só administrador.
    @Post(':id/copies/:copyId/unblock')
    @HttpCode(200)
    unblockDevice(
        @Param('id', ParseIntPipe) id: number,
        @Param('copyId', ParseIntPipe) copyId: number,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.unblockCopyDevice(id, copyId, currentUser);
    }

    // Devolução da cópia pelo próprio aparelho (identificado por `X-Device-ID`).
    @Post(':id/return')
    @HttpCode(200)
    returnCopy(
        @Param('id', ParseIntPipe) id: number,
        @Headers('x-device-id') deviceId: string | undefined,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.returnOwnCopy(id, requireDeviceId(deviceId), currentUser);
    }

    @Get(':id/download')
    download(
        @Param('id', ParseIntPipe) id: number,
        @Headers('x-device-id') deviceId: string | undefined,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.researchService.downloadPackage(id, requireDeviceId(deviceId), currentUser);
    }
}

type ReportQueryDto = { from?: string; to?: string; researcherId?: string };

function toReportQuery(query: ReportQueryDto) {
    let researcherId: number | undefined;
    if (query.researcherId !== undefined && query.researcherId !== '') {
        researcherId = Number(query.researcherId);
        if (!Number.isInteger(researcherId)) throw new BadRequestException('researcherId inválido.');
    }
    return { from: query.from || undefined, to: query.to || undefined, researcherId };
}

// A cópia é registrada por pesquisador + aparelho: sem aparelho identificado não há como registrá-la.
function requireDeviceId(deviceId: string | undefined): string {
    const value = deviceId?.trim();
    if (!value) throw new BadRequestException('Aparelho não identificado: envie o cabeçalho X-Device-ID.');
    return value.slice(0, 200);
}
