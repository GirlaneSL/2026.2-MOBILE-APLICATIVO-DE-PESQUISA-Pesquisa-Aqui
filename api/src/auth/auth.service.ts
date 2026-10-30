import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserService } from '../user/user.service.js';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private prisma: PrismaService
    ) { }

    async login(loginDto: LoginDto): Promise<{ access_token: string }> {
        const user = await this.userService.findOne(loginDto.username).catch((error) => {
            if (error instanceof NotFoundException) return null;
            throw error;
        });

        if (!user || (!await bcrypt.compare(loginDto.password, user.passwordHash))) {
            throw new UnauthorizedException('Invalid user or password');
        }

        if (loginDto.platform === 'mobile' && user.profile !== 'RESEARCHER') {
            throw new ForbiddenException('Acesso negado: Aplicativo exclusivo para pesquisadores.');
        }

        if (user.situation === 'INACTIVE') {
            throw new UnauthorizedException('Access denied: Inactive user');
        }

        if (user.companyId) {
            const company = await this.prisma.client.orm.public.Company.where({ id: user.companyId }).first();

            if (company && company.situation === 'INACTIVE') {
                throw new UnauthorizedException('Access denied: Inactive company')
            }
        }

        const payload = {
            sub: user.username,
            name: user.name,
            profile: user.profile,
            companyId: user.companyId
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
        }
    }

    async getMe(payload: any) {
        if (!payload.companyId) return payload;

        const company = await this.prisma.client.orm.public.Company.where({ id: payload.companyId }).first();

        return {
            ...payload,
            companyName: company?.legalName ?? null,
        };
    }

    // Dados atuais do usuário logado (direto do banco, sem a senha) e o nome da empresa.
    async getProfile(payload: any) {
        const user = await this.userService.findOne(String(payload.sub));

        return this.toProfile(user);
    }

    // O próprio usuário altera nome, usuário e senha. Quem manda no pesquisador é o administrador da empresa,
    // então pesquisador não edita o próprio cadastro por aqui.
    // Devolve também um token novo: o token carrega nome e usuário, que podem ter mudado.
    async updateProfile(payload: any, dto: UpdateProfileDto) {
        if (payload.profile === 'RESEARCHER') {
            throw new ForbiddenException('Researchers cannot edit their own profile');
        }

        const user = await this.userService.findOne(String(payload.sub));
        const users = this.prisma.client.orm.public.User;
        const data: { name?: string; username?: string; passwordHash?: string } = {};

        const name = dto.name?.trim();

        if (name && name !== user.name) data.name = name;

        const username = dto.username?.trim();

        if (username && username !== user.username) {
            const existingUser = await users.where({ username }).first();

            if (existingUser) throw new ConflictException('Username already exists');

            data.username = username;
        }

        if (dto.newPassword) {
            // 400 (e não 401): o painel desloga a pessoa em qualquer 401.
            if (!dto.currentPassword) throw new BadRequestException('Current password is required');

            if (!await bcrypt.compare(dto.currentPassword, user.passwordHash)) {
                throw new BadRequestException('Current password is incorrect');
            }

            data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        }

        if (Object.keys(data).length > 0) {
            await users.where({ username: user.username }).update(data);
        }

        const updated = await this.userService.findOne(data.username ?? user.username);

        const access_token = await this.jwtService.signAsync({
            sub: updated.username,
            name: updated.name,
            profile: updated.profile,
            companyId: updated.companyId,
        });

        return { profile: await this.toProfile(updated), access_token };
    }

    private async toProfile(user: Awaited<ReturnType<UserService['findOne']>>) {
        const { passwordHash: _, ...userWithoutPassword } = user;

        let companyName: string | null = null;

        if (user.companyId) {
            const company = await this.prisma.client.orm.public.Company.where({ id: user.companyId }).first();

            companyName = company?.legalName ?? null;
        }

        return { ...userWithoutPassword, companyName };
    }
}
