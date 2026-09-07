import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateSectionDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNumber()
    @IsNotEmpty()
    order: number;

    @IsNumber()
    @IsNotEmpty()
    researchId: number;
}
