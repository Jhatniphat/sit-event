import { Injectable, NotFoundException } from '@nestjs/common';
import { RegistrationStatus } from 'generated/prisma/wasm';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventStats(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        sessions: true,
        _count: {
          select: { registrations: true, staff: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      select: {
        status: true,
        attended: true,
        registeredAt: true,
      },
    });

    const statusCounts = registrations.reduce(
      (acc, curr) => {
        const s = curr.status;
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const attendedCount = registrations.filter((r) => r.attended).length;
    const totalCapacity = event.sessions.reduce(
      (sum, s) => sum + s.maxSeats,
      0,
    );
    const currentAvailable = event.sessions.reduce(
      (sum, s) => sum + s.availableSeats,
      0,
    );
    const totalUsedSeats = totalCapacity - currentAvailable;

    const capacityPercentage =
      totalCapacity > 0 ? (totalUsedSeats / totalCapacity) * 100 : 0;
    const checkInPercentage =
      event._count.registrations > 0
        ? (attendedCount / event._count.registrations) * 100
        : 0;

    return {
      event: {
        id: event.id,
        name: event.name,
        dates: {
          start: event.eventStartDate,
          end: event.eventEndDate,
        },
        status: this.getEventStatus(event.eventStartDate, event.eventEndDate),
      },
      stats: {
        totalRegistrations: event._count.registrations,
        totalStaff: event._count.staff,
        attended: attendedCount,
        checkedInPercentage: parseFloat(checkInPercentage.toFixed(2)),
        capacity: {
          total: totalCapacity,
          used: totalUsedSeats,
          remaining: currentAvailable,
          percentage: parseFloat(capacityPercentage.toFixed(2)),
        },
        registrationStatus: {
          pending: statusCounts[RegistrationStatus.PENDING] || 0,
          approved: statusCounts[RegistrationStatus.APPROVED] || 0,
          rejected: statusCounts[RegistrationStatus.REJECTED] || 0,
        },
      },
    };
  }

  private getEventStatus(start: Date, end: Date) {
    const now = new Date();
    if (now < start) return 'UPCOMING';
    if (now > end) return 'PAST';
    return 'ONGOING';
  }
}
