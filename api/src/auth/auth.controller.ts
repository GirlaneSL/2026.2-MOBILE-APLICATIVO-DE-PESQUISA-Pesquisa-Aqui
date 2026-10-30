import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { Response } from 'express';
import { AuthGuard } from './auth.guard.js';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
// const COOKIE_MAX_AGE_MS = 5 * 1000; // 5 segundos

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
});

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { access_token } = await this.authService.login(loginDto);

        res.cookie(COOKIE_NAME, access_token, cookieOptions())

        return { access_token, message: 'Logged in successfully' };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie(COOKIE_NAME, { path: '/' });

        return { message: 'Logged out' };
    }

    @UseGuards(AuthGuard)
    @Get('me')
    async me(@Req() req: Request) {
        return this.authService.getMe(req['user']);
    }

    // Perfil do usuário logado, direto do banco (nome, usuário, empresa, datas).
    @UseGuards(AuthGuard)
    @Get('profile')
    async profile(@Req() req: Request) {
        return this.authService.getProfile(req['user']);
    }

    // O usuário edita o próprio nome, usuário e senha. O cookie é renovado porque o token carrega nome e usuário.
    @UseGuards(AuthGuard)
    @Patch('profile')
    async updateProfile(
        @Req() req: Request,
        @Body() dto: UpdateProfileDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { profile, access_token } = await this.authService.updateProfile(req['user'], dto);

        res.cookie(COOKIE_NAME, access_token, cookieOptions());

        return profile;
    }

}
