import { IsEnum } from "class-validator";
import { RegistrationStatus } from "generated/prisma";

export class UpdateRegistrationsStatusDto {
    @IsEnum(RegistrationStatus)
    status: RegistrationStatus;
}