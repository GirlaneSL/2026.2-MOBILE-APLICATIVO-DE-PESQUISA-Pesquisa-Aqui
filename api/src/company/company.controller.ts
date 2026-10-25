import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { isPaged, SituationPageQueryDto } from '../common/pagination.js';

@UseGuards(AuthGuard)
@Controller('company')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) { }

    @Get()
    // Painel web: `?page=&pageSize=&q=&situation=&sort=` devolve só uma página. Sem `page`/`pageSize`, lista inteira.
    findAll(@Query() query: SituationPageQueryDto, @CurrentUser() user: UserPayLoad) {
        console.log('Quem está chamando a rota:', user);
        if (isPaged(query)) return this.companyService.findPage(query, user);
        return this.companyService.findAll(user);
    }

    // Totais da tela de empresas, sem listar nada (precisa vir antes de ":id").
    @Get('stats')
    stats(@CurrentUser() user: UserPayLoad) {
        return this.companyService.stats(user);
    }

    @Post()
    create(@Body() createCompanyDto: CreateCompanyDto, @CurrentUser() user: UserPayLoad) {
        return this.companyService.create(createCompanyDto, user);
    }

    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCompanyDto: UpdateCompanyDto,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.companyService.update(id, updateCompanyDto, currentUser);
    }

    @Patch(':id')
    deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.companyService.deactivate(id, currentUser);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.companyService.remove(id, currentUser);
    }
}
