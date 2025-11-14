import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyToBeStaffDto {
    @IsString()
    @IsNotEmpty()
    eventRole: string;
}