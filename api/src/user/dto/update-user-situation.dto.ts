import { IsIn } from 'class-validator';

export class UpdateUserSituationDto {
    @IsIn(['ACTIVE', 'INACTIVE'])
    situation: 'ACTIVE' | 'INACTIVE';
}
