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

export class EventParticipantDto {
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
  sessionId!: string | null;

  @Expose()
  sessionName!: string | null;

  @Expose()
  checkedInAt!: Date | null;

  @Expose()
  registeredAt!: Date;
}

export class PaginationMetadata {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
  hasNext!: boolean;
  hasPrev!: boolean;
}

export class EventSummaryStats {
  totalRegistered!: number;
  totalAttended!: number;
  totalApproved!: number;
  totalPending!: number;
  totalRejected!: number;
  attendanceRate!: string; // e.g., "58%"
}

export class SessionSummaryStats {
  sessionId!: string;
  sessionName!: string;
  maxSeats!: number | null;
  availableSeats!: number | null;
  totalRegistered!: number;
  totalAttended!: number;
  totalApproved!: number;
  totalPending!: number;
  totalRejected!: number;
  attendanceRate!: string; // e.g., "86%"
}

export class PaginatedParticipantsDto {
  data!: SessionParticipantDto[];
  pagination!: PaginationMetadata;
}

export class PaginatedEventParticipantsDto {
  summary!: EventSummaryStats;
  data!: EventParticipantDto[];
  pagination!: PaginationMetadata;
}

export class PaginatedSessionParticipantsDto {
  summary!: SessionSummaryStats;
  data!: SessionParticipantDto[];
  pagination!: PaginationMetadata;
}

export class GetSessionParticipantsQueryDto {
  page?: number = 1;
  limit?: number = 20;
  search?: string; // Search by firstName, lastName, or email
}
