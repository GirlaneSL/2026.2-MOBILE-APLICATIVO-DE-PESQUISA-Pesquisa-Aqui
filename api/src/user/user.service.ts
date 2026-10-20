import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
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

    async findAllAdmin(currentUser: UserPayLoad) {

        if (currentUser.profile === 'SUPERADMINISTRATOR') {
            const users = await this.prisma.client.orm.public.User.where({ profile: 'ADMINISTRATOR' }).all()

            return users.map(user => {
                const { passwordHash: _, ...userWithoutPassword } = user;
                return userWithoutPassword;
            })
        }

    }

    async create(createUserDto: CreateUserDto, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') {
            throw new ForbiddenException('Researchers cannot register users');
        }

        let companyId = createUserDto.companyId;

        if (currentUser.profile === 'ADMINISTRATOR') {
            if (createUserDto.profile !== 'RESEARCHER') {
                throw new ForbiddenException('Administrators can only register researchers');
            }

            if (!currentUser.companyId) {
                throw new ForbiddenException('User is not associated with a company');
            }

            companyId = currentUser.companyId;
        }

        if (currentUser.profile === 'SUPERADMINISTRATOR' && !companyId) {
            throw new BadRequestException('The company ID is required for super administrators');
        }

        const existingUser = await this.prisma.client.orm.public.User.where({ username: createUserDto.username }).first();

        if (existingUser) throw new ConflictException('Username already exists');

        const passwordHash = await bcrypt.hash(createUserDto.password, 10);

        const newUser = await this.prisma.client.orm.public.User.create({
            name: createUserDto.name,
            username: createUserDto.username,
            passwordHash,
            profile: createUserDto.profile,
            companyId: companyId,
        });

        const { passwordHash: _, ...userWithoutPassword } = newUser;

        return userWithoutPassword;
    }

    // Quem pode mexer em quem:
    // - superadministrador: administradores e pesquisadores (nunca outro superadministrador);
    // - administrador: somente pesquisadores da própria empresa;
    // - pesquisador: ninguém.
    private assertCanManage(
        target: { profile: string; companyId: number | null },
        currentUser: UserPayLoad,
        action: 'edit' | 'delete' | 'deactivate',
    ) {
        if (currentUser.profile === 'RESEARCHER') {
            throw new ForbiddenException('Researchers cannot manage users');
        }

        if (target.profile === 'SUPERADMINISTRATOR') {
            const verb = action === 'delete' ? 'deleted' : action === 'edit' ? 'edited' : 'deactivated';

            throw new ForbiddenException(`Superadministrators cannot be ${verb}`);
        }

        if (currentUser.profile === 'ADMINISTRATOR') {
            const sameCompany = !!currentUser.companyId && target.companyId === currentUser.companyId;

            if (target.profile !== 'RESEARCHER' || !sameCompany) {
                throw new ForbiddenException('Administrators can only manage researchers from their own company');
            }
        }
    }

    async update(username: string, updateUserDto: UpdateUserDto, currentUser: UserPayLoad) {
        const target = await this.findOne(username);

        this.assertCanManage(target, currentUser, 'edit');

        const data: { name?: string; username?: string; passwordHash?: string } = {};

        if (updateUserDto.name !== undefined) data.name = updateUserDto.name.trim();

        const newUsername = updateUserDto.username?.trim();

        if (newUsername && newUsername !== target.username) {
            const existingUser = await this.prisma.client.orm.public.User.where({ username: newUsername }).first();

            if (existingUser) throw new ConflictException('Username already exists');

            data.username = newUsername;
        }

        if (updateUserDto.password) {
            data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
        }

        if (Object.keys(data).length > 0) {
            await this.prisma.client.orm.public.User.where({ username }).update(data);
        }

        const updated = await this.findOne(data.username ?? username);

        const { passwordHash: _, ...userWithoutPassword } = updated;

        return userWithoutPassword;
    }

    async setSituation(username: string, situation: 'ACTIVE' | 'INACTIVE', currentUser: UserPayLoad) {
        if (username === String(currentUser.sub)) {
            throw new ForbiddenException('You cannot deactivate your own account');
        }

        const target = await this.findOne(username);

        this.assertCanManage(target, currentUser, 'deactivate');

        await this.prisma.client.orm.public.User.where({ username }).update({ situation });

        const updated = await this.findOne(username);

        const { passwordHash: _, ...userWithoutPassword } = updated;

        return userWithoutPassword;
    }

    async delete(username: string, currentUser: UserPayLoad) {
        // No token, "sub" guarda o username de quem está logado.
        if (username === String(currentUser.sub)) {
            throw new ForbiddenException('You cannot delete your own account');
        }

        const user = await this.findOne(username);

        this.assertCanManage(user, currentUser, 'delete');

        // Coletas e envios já registrados não têm exclusão em cascata: apagar o pesquisador
        // quebraria o histórico (e o banco recusaria). Melhor avisar do que dar erro genérico.
        const orm = this.prisma.client.orm.public;
        const hasCollections = await orm.Collection.where({ researcherId: user.id }).first();
        const hasSyncLogs = await orm.SyncLog.where({ researcherId: user.id }).first();

        if (hasCollections || hasSyncLogs) {
            throw new ConflictException('User has collected data and cannot be deleted');
        }

        await orm.User.where({ username }).delete();

        const { passwordHash: _, ...userWithoutPassword } = user;

        return userWithoutPassword;
    }
}
