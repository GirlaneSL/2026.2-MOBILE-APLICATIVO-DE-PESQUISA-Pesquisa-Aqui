import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateQuestionRuleDto {
  @IsInt()
  sourceQuestionId: number;

  // YES_NO: "YES" | "NO"; escolhas: id da opção; escala: "1" a "5".
  @IsString()
  @IsNotEmpty()
  triggerValue: string;

  @IsInt()
  targetQuestionId: number;
}
