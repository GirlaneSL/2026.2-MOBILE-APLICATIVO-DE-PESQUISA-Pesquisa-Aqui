import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

// Dados que o próprio usuário pode alterar no perfil. Tudo é opcional: só o que vier é alterado.
export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    username?: string;

    // Obrigatória quando newPassword é enviada.
    @IsOptional()
    @IsString()
    currentPassword?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    newPassword?: string;
}
