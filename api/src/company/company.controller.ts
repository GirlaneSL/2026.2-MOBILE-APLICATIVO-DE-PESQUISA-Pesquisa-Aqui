import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';

@UseGuards(AuthGuard)
@Controller('company')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) { }

    @Get()
    findAll(@CurrentUser() user: UserPayLoad) {
        console.log('Quem está chamando a rota:', user);
        return this.companyService.findAll(user);
    }

    @Post()
    create(@Body() createCompanyDto: CreateCompanyDto, @CurrentUser() user: UserPayLoad) {
        return this.companyService.create(createCompanyDto, user);
    }

    @Patch(':id')
    deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.companyService.deactivate(id, currentUser);
    }
}
