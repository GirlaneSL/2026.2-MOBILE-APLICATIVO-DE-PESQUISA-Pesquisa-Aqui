import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum ResearchStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    IN_FIELD = 'IN_FIELD',
    CLOSED = 'CLOSED',
}

export class CreateResearchDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsString()
    objective: string;

    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @IsNotEmpty()
    @IsDateString()
    endDate: string;

    @IsNotEmpty()
    @IsString()
    targetAudience: string;

    @IsOptional()
    @IsEnum(ResearchStatus)
    status?: ResearchStatus

    @IsOptional()
    @IsInt()
    companyId?: number;
}