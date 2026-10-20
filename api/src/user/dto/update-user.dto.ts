import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    username?: string;

    // Só é enviada quando a senha vai ser trocada.
    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;
}
