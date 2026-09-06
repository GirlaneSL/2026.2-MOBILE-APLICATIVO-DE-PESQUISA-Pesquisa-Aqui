import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { Response } from 'express';
import { AuthGuard } from './auth.guard.js';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { access_token } = await this.authService.login(loginDto);

        res.cookie(COOKIE_NAME, access_token), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE_MS,
            path: '/',
        }

        return { message: 'Logged in successfully' };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie(COOKIE_NAME, { path: '/' });

        return { message: 'Logged out' };
    }

    @UseGuards(AuthGuard)
    @Get('me')
    async me(@Req() req: Request) {
        return req['user'];
    }

}
