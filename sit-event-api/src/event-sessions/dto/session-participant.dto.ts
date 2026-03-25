import { Expose } from 'class-transformer';

export class SessionParticipantDto {
  @Expose()
  userId!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Expose()
  attended!: boolean;

  @Expose()
  checkedInAt!: Date | null;

  @Expose()
  registeredAt!: Date;
}

export class PaginatedParticipantsDto {
  data!: SessionParticipantDto[];
  total!: number;
  limit!: number;
  offset!: number;
}

export class GetSessionParticipantsQueryDto {
  limit?: number = 20;
  offset?: number = 0;
  search?: string; // Search by firstName, lastName, or email
}
