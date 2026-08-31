import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class UserService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async findOne(username: string) {
        const user = await this.prisma.client.orm.public.User.where({ username }).first()

        if (!user) throw new NotFoundException('User not found')

        return user
    }

}
