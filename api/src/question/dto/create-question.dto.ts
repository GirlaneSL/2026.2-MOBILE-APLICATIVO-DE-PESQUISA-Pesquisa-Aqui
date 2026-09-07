import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

enum QuestionType {
    FREE_TEXT = 'FREE_TEXT',
    NUMERIC = 'NUMERIC',
    DATE = 'DATE',
    TIME = 'TIME',
    YES_NO = 'YES_NO',
    SINGLE_CHOICE = 'SINGLE_CHOICE',
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
    SCALE_1_5 = 'SCALE_1_5',
    PHOTO = 'PHOTO',
    MULTIPLE_PHOTOS = 'MULTIPLE_PHOTOS',
    LOCATION = 'LOCATION',
    AUDIO = 'AUDIO',
}

export class CreateQuestionDto {
    @IsNotEmpty()
    @IsString()
    statement: string;

    @IsEnum(QuestionType)
    @IsNotEmpty()
    type: QuestionType;

    @IsOptional()
    @IsString()
    helpText?: string;

    @IsBoolean()
    isRequired: boolean;

    @IsNumber()
    @IsNotEmpty()
    order: number;

    @IsNumber()
    @IsNotEmpty()
    sectionId: number;
}
