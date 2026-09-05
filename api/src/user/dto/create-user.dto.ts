import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export enum Profile {
    SUPERADMINISTRATOR = 'SUPERADMINISTRATOR',
    ADMINISTRATOR = 'ADMINISTRATOR',
    RESEARCHER = 'RESEARCHER',
}

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsEnum(Profile)
    @IsNotEmpty()
    profile: Profile;

    @IsOptional()
    @IsInt()
    companyId?: number;
}