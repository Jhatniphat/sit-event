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

    const eventRegistrations = await this.prisma.eventRegistration.findMany({
      where: { 
        eventId,
        sessionId: null // Only event registrations
      },
      select: {
        status: true,
        attended: true,
        registeredAt: true,
      },
    });

    const statusCounts = eventRegistrations.reduce(
      (acc, curr) => {
        const s = curr.status;
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const attendedCount = eventRegistrations.filter((r) => r.attended).length;
    const totalCapacity = event.sessions.reduce(
      (sum, s) => sum + (s.maxSeats || 0), // todo : fix this bug from max seat bug later now im bypass by add || 0
      0,
    );
    const currentAvailable = event.sessions.reduce(
      (sum, s) => sum + (s.availableSeats || 0), // todo : fix this bug from max seat bug later now im bypass by add || 0
      0,
    );
    const totalUsedSeats = totalCapacity - currentAvailable;

    const capacityPercentage =
      totalCapacity > 0 ? (totalUsedSeats / totalCapacity) * 100 : 0;
    const totalEventRegistrations = eventRegistrations.length;
    const checkInPercentage =
      totalEventRegistrations > 0
        ? (attendedCount / totalEventRegistrations) * 100
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
        totalRegistrations: totalEventRegistrations,
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

  async getSessionStats(sessionId: string) {
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
      include: {
        registrations: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    const registrations = session.registrations;
    const attendedCount = registrations.filter((r) => r.attended).length;
    
    // Status counts for session
    const statusCounts = registrations.reduce(
      (acc, curr) => {
        const s = curr.status;
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const checkInPercentage =
      registrations.length > 0
        ? (attendedCount / registrations.length) * 100
        : 0;

    const totalUsedSeats = (session.maxSeats || 0) - (session.availableSeats || 0);  // todo : fix this bug from max seat bug later now im bypass by add || 0
    const capacityPercentage =
      (session.maxSeats || 0) > 0 ? (totalUsedSeats / (session.maxSeats || 0)) * 100 : 0;  // todo : fix this bug from max seat bug later now im bypass by add || 0

    return {
      session: {
        id: session.id,
        name: session.name,
      },
      stats: {
        totalRegistrations: registrations.length,
        attended: attendedCount,
        checkedInPercentage: parseFloat(checkInPercentage.toFixed(2)),
        capacity: {
          total: session.maxSeats,
          used: totalUsedSeats,
          remaining: session.availableSeats,
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
