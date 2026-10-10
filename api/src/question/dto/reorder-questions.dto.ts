import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsOptional } from 'class-validator';

export class ReorderQuestionsDto {
  @IsInt()
  sectionId: number;

  // IDs de TODAS as questões da seção, na nova ordem.
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  orderedIds: number[];

  // Confirma a exclusão das regras que a nova ordem deixaria apontando para trás.
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
