import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import type { UserPayLoad } from '../auth/current-user.type.js';

@Injectable()
export class CompanyService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async findAll(currentUser: UserPayLoad) {
        // Regra 1: Superadmin vê mais de uma empresa (vê todas)
        if (currentUser.profile === 'SUPERADMINISTRATOR') return this.prisma.client.orm.public.Company.all()

        // Regra 2: O administrador (e pesquisador) vive dentro da dele
        if (!currentUser.companyId) throw new ForbiddenException('User has no associated company')

        // Filtra no banco para retornar APENAS a empresa cujo ID seja o do usuário logado
        return this.prisma.client.orm.public.Company.where({ id: currentUser.companyId }).all();

    }

    async create(createCompanyDto: CreateCompanyDto, currentUser: UserPayLoad) {

        if (currentUser.profile !== 'SUPERADMINISTRATOR') throw new ForbiddenException('Only super administrators can create companies.');

        return this.prisma.client.orm.public.Company.create({
            legalName: createCompanyDto.legalName,
            contactInformation: createCompanyDto.contactInformation,
            situation: createCompanyDto.situation,
        })
    }

    async deactivate(id: number, currentUser: UserPayLoad) {

        if (currentUser.profile !== 'SUPERADMINISTRATOR') throw new ForbiddenException('Only super administrators can deactivate companies.');

        return await this.prisma.client.orm.public.Company.where({ id }).update({ situation: 'INACTIVE' })

    }

    private async findOne(id: number) {
        const company = await this.prisma.client.orm.public.Company.where({ id }).first();

        if (!company) throw new NotFoundException('Company not found');

        return company;
    }

    async update(id: number, updateCompanyDto: UpdateCompanyDto, currentUser: UserPayLoad) {

        if (currentUser.profile !== 'SUPERADMINISTRATOR') throw new ForbiddenException('Only super administrators can edit companies.');

        await this.findOne(id);

        const data: { legalName?: string; contactInformation?: string; situation?: 'ACTIVE' | 'INACTIVE' } = {};

        if (updateCompanyDto.legalName !== undefined) data.legalName = updateCompanyDto.legalName.trim();
        if (updateCompanyDto.contactInformation !== undefined) data.contactInformation = updateCompanyDto.contactInformation.trim();
        if (updateCompanyDto.situation !== undefined) data.situation = updateCompanyDto.situation as 'ACTIVE' | 'INACTIVE';

        if (Object.keys(data).length > 0) {
            await this.prisma.client.orm.public.Company.where({ id }).update(data);
        }

        return this.findOne(id);
    }

    async remove(id: number, currentUser: UserPayLoad) {

        if (currentUser.profile !== 'SUPERADMINISTRATOR') throw new ForbiddenException('Only super administrators can delete companies.');

        const company = await this.findOne(id);

        // Usuários e pesquisas não são apagados em cascata: com vínculos, o caminho é desativar.
        const orm = this.prisma.client.orm.public;
        const hasUsers = await orm.User.where({ companyId: id }).first();
        const hasResearches = await orm.Research.where({ companyId: id }).first();

        if (hasUsers || hasResearches) {
            throw new ConflictException('Company has linked users or researches and cannot be deleted');
        }

        await orm.Company.where({ id }).delete();

        return company;
    }

}
