import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { AuthGuard } from '../auth/auth.guard.js';

@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.userService.create(createUserDto, currentUser);
    }

    @Get()
    findAll(@CurrentUser() currentUser: UserPayLoad) {
        return this.userService.findAll(currentUser);
    }

    @Get('/admins')
    findAllAdmin(@CurrentUser() currentUser: UserPayLoad) {
        return this.userService.findAllAdmin(currentUser);
    }

    @Delete(':username')
    delete(@Param('username') username: string, @CurrentUser() currentUser: UserPayLoad) {
        return this.userService.delete(username, currentUser);
    }
}
