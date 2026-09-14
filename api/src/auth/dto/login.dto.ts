import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsOptional()
    @IsString()
    @IsIn(['web', 'mobile'])
    platform?: string;
}