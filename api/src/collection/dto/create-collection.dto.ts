import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsDefined,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

export class CollectionAnswerDto {
    @IsInt()
    questionId: number;

    // Respostas de tipos compostos (múltipla escolha, localização...) chegam serializadas como texto.
    @IsString()
    value: string;
}

export class ConsentDto {
    @IsBoolean()
    accepted: boolean;

    // Data e hora em que o aplicativo registrou o aceite do entrevistado.
    @IsDateString()
    acceptedAt: string;
}

export class CollectionPayloadDto {
    @IsInt()
    researchId: number;

    // Identificador gerado no aparelho: reenviar a mesma coleta não a duplica.
    @IsOptional()
    @IsString()
    @MaxLength(100)
    clientId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    deviceId?: string;

    @IsDateString()
    startedAt: string;

    @IsDateString()
    finishedAt: string;

    // Opcional aqui de propósito: a ausência dele é recusada pelo serviço com o código
    // CONSENT_REQUIRED quando a pesquisa grava a entrevista.
    @IsOptional()
    @ValidateNested()
    @Type(() => ConsentDto)
    consent?: ConsentDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CollectionAnswerDto)
    answers: CollectionAnswerDto[];

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(24 * 60 * 60)
    audioDurationSeconds?: number;
}

// A coleta chega em multipart: o campo de texto `payload` (JSON) e, opcionalmente, o arquivo `audio`.
// Também aceita `payload` já como objeto quando enviada em JSON puro (coleta sem áudio).
export class CreateCollectionDto {
    @IsDefined()
    @Transform(({ value }) => {
        if (typeof value !== 'string') return value;
        try {
            return JSON.parse(value);
        } catch {
            return undefined; // vira erro de validação (payload ausente)
        }
    })
    @ValidateNested()
    @Type(() => CollectionPayloadDto)
    payload: CollectionPayloadDto;
}
