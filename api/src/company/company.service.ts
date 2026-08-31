import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';

@Injectable()
export class CompanyService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.client.orm.public.Company.all()
    }

    async create(createCompanyDto: CreateCompanyDto) {
        return this.prisma.client.orm.public.Company.create({
            legalName: createCompanyDto.legalName,
            contactInformation: createCompanyDto.contactInformation,
            situation: createCompanyDto.situation,
        })
    }

}
