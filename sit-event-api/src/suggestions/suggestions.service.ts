import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSuggestionDto: CreateSuggestionDto) {
    return this.prisma.suggestion.create({
      data: createSuggestionDto,
    });
  }

  async findAll() {
    return this.prisma.suggestion.findMany({
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.suggestion.findMany({
      where: {
        OR: [
          {
            announcementType: 'REGISTRATION',
            event: {
              registrationOpenDate: { lte: now },
              registrationEndDate: { gte: now },
            }
          },
          {
            announcementType: 'IN_EVENT',
            event: {
              eventStartDate: { lte: now },
              eventEndDate: { gte: now },
            }
          },
          {
            announcementType: 'PRE_EVENT',
            startDate: { lte: now },
            event: {
              registrationOpenDate: { gt: now },
            }
          },
          {
            announcementType: 'OTHERS',
            startDate: { lte: now },
            endDate: { gte: now },
          }
        ]
      },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id },
    });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    return suggestion;
  }

  async update(id: string, updateSuggestionDto: UpdateSuggestionDto) {
    await this.findOne(id);
    return this.prisma.suggestion.update({
      where: { id },
      data: updateSuggestionDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.suggestion.delete({
      where: { id },
    });
  }
}
