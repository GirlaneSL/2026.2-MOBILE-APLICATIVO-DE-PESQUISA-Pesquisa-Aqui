import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateResearchDto } from './dto/create-research.dto.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';

@Injectable()
export class ResearchService {
    constructor(private prisma: PrismaService) { }

    async create(createResearchDto: CreateResearchDto, currentUser: UserPayLoad) {
        if (new Date(createResearchDto.endDate) < new Date(createResearchDto.startDate)) throw new BadRequestException('The end date cannot be earlier than the start date');

        let companyId = currentUser.companyId;

        if (currentUser.profile === 'SUPERADMINISTRATOR') {
            if (!createResearchDto.companyId) throw new BadRequestException('The company ID is required for super administrators');
            companyId = createResearchDto.companyId;
        }

        if (!companyId) throw new ForbiddenException('User is not associated with a company');

        return await this.prisma.client.orm.public.Research.create({
            title: createResearchDto.title,
            description: createResearchDto.description,
            objective: createResearchDto.objective,
            startDate: createResearchDto.startDate,
            endDate: createResearchDto.endDate,
            targetAudience: createResearchDto.targetAudience,
            status: 'DRAFT',
            companyId: companyId,
        })
    }

    async findAll(currentUser: UserPayLoad) {
        if (currentUser.profile === 'SUPERADMINISTRATOR') return this.prisma.client.orm.public.Research.all()

        if (!currentUser.companyId) throw new ForbiddenException('User is not associated with a company');

        return await this.prisma.client.orm.public.Research.where({ companyId: currentUser.companyId }).all()
    }

    async findOne(id: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'SUPERADMINISTRATOR') {
            const research = await this.prisma.client.orm.public.Research.where({ id }).first()
            if (!research) throw new NotFoundException('Research not found')
            return research;
        }

        const research = await this.prisma.client.orm.public.Research.where({ id, companyId: currentUser.companyId }).first()

        if (!research) throw new ForbiddenException('Access denied: this research belongs to another company or does not exist');

        return research;
    }

    async update(id: number, updateResearchDto: UpdateResearchDto, currentUser: UserPayLoad) {
        const research = await this.findOne(id, currentUser)

        if (research.status === 'CLOSED') throw new BadRequestException('Closed research cannot be modified');

        if (updateResearchDto.startDate && updateResearchDto.endDate) {
            if (new Date(updateResearchDto.endDate) < new Date(updateResearchDto.startDate)) throw new BadRequestException('The end date cannot be earlier than the start date');
        }

        return await this.prisma.client.orm.public.Research.where({ id }).update(updateResearchDto);
    }

    async delete(id: number, currentUser: UserPayLoad) {
        const research = await this.findOne(id, currentUser)

        if (research.status !== 'DRAFT') throw new BadRequestException('Only draft research can be deleted.');

        return this.prisma.client.orm.public.Research.where({ id }).delete()
    }

}
