import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { PrismaService } from '../prisma.service.js';
import { UserPayLoad } from '../auth/current-user.type.js';
import { ResearchService } from '../research/research.service.js';

@Injectable()
export class SectionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly researchService: ResearchService,
  ) { }

  async create(createSectionDto: CreateSectionDto, currentUser: UserPayLoad) {
    await this.researchService.findOne(createSectionDto.researchId, currentUser);

    return await this.prisma.client.orm.public.Section.create({
      title: createSectionDto.title,
      researchId: createSectionDto.researchId,
      order: createSectionDto.order,
    });
  }

  async findAll(researchId: number, currentUser: UserPayLoad) {
    await this.researchService.findOne(researchId, currentUser)
    return this.prisma.client.orm.public.Section.where({ researchId }).all();
  }

  async findOne(id: number, currentUser: UserPayLoad) {
    const section = await this.prisma.client.orm.public.Section.where({ id }).first()

    if (!section) throw new NotFoundException('Section not found')

    await this.researchService.findOne(section.researchId, currentUser)

    return section;
  }

  async update(id: number, updateSectionDto: UpdateSectionDto, currentUser: UserPayLoad) {
    await this.findOne(id, currentUser);

    return this.prisma.client.orm.public.Section.where({ id }).update(updateSectionDto);
  }

  async remove(id: number) {
    return `This action removes a #${id} section`;
  }
}
