import { Inject, Injectable } from '@nestjs/common';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class SectionService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

  async create(createSectionDto: CreateSectionDto) {
  
  }

  async findAll() {
    return `This action returns all section`;
  }

  async findOne(id: number) {
    return `This action returns a #${id} section`;
  }

  async update(id: number, updateSectionDto: UpdateSectionDto) {
    return `This action updates a #${id} section`;
  }

  async remove(id: number) {
    return `This action removes a #${id} section`;
  }
}
