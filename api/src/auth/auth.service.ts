import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
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

        if (user.companyId) {
            const company = await this.prisma.client.orm.public.Company.where({ id: user.companyId }).first();

            if (company && company.situation === 'INACTIVE') {
                throw new UnauthorizedException('Access denied: Inactive company')
            }
        }

        const payload = {
            sub: user.username,
            profile: user.profile,
            companyId: user.companyId
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
        }
    }
}
