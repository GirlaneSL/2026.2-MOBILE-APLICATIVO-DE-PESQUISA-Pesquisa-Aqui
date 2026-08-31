import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

enum CompanySituation {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

export class CreateCompanyDto {
    @IsNotEmpty()
    @IsString()
    legalName: string;

    @IsNotEmpty()
    @IsString()
    contactInformation: string;

    @IsOptional()
    @IsEnum(CompanySituation)
    situation?: CompanySituation
}
