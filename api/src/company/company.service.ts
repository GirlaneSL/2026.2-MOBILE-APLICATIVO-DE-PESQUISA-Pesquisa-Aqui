import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
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

}
