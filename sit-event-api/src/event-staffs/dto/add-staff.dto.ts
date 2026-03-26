import { IsNotEmpty, IsString } from "class-validator";

export class AddStaffDto {
    @IsString()
    @IsNotEmpty()
    eventRole!: string;
}

// DTO for userId parameter validation
export class StaffUserIdParamDto {
    @IsString()
    @IsNotEmpty()
    userId!: string;
}