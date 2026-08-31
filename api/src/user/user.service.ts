import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async findOne(username: string) {
        const user = await this.prisma.client.orm.public.User.where({ username }).first()

        if (!user) throw new NotFoundException('User not found')

        return user;
    }

    async findAll(currentUser: UserPayLoad) {
        let users;

        if (currentUser.profile === 'SUPERADMINISTRATOR') {
            users = await this.prisma.client.orm.public.User.all();
        } else {
            users = await this.prisma.client.orm.public.User.where({
                companyId: currentUser.companyId,
            }).all();
        }

        return users.map(user => {
            const { passwordHash: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        })

    }

    async create(createUserDto: CreateUserDto, currentUser: UserPayLoad) {
        if (currentUser.profile !== 'SUPERADMINISTRATOR') throw new ForbiddenException('Only super administrators can register new users');

        const passwordHash = await bcrypt.hash(createUserDto.password, 10)

        const newUser = await this.prisma.client.orm.public.User.create({
            name: createUserDto.name,
            username: createUserDto.username,
            passwordHash,
            profile: createUserDto.profile,
            companyId: createUserDto.companyId,
        })

        const { passwordHash: _, ...userWithoutPassword } = newUser;

        return userWithoutPassword;
    }
}
