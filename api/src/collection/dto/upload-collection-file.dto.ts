import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

// Campos de texto do multipart; o arquivo vai no campo `file`.
// A coleta vem na rota (UUID do aparelho); a questão e o nome vêm aqui.
export class UploadCollectionFileDto {
    @IsIn(['PHOTO', 'AUDIO'])
    kind: 'PHOTO' | 'AUDIO';

    // Questão a que a foto pertence (o áudio é da coleta, não de uma questão).
    @ValidateIf((o: UploadCollectionFileDto) => o.kind === 'PHOTO')
    @Type(() => Number)
    @IsInt()
    questionId?: number;

    // Nome da foto: é o valor que a resposta da questão guarda.
    @ValidateIf((o: UploadCollectionFileDto) => o.kind === 'PHOTO')
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    fileName?: string;
}
