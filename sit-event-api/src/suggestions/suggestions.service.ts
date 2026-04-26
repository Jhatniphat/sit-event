import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { PrismaService } from '../prisma.service';
import { MinioClientService } from '../minio/minio-client.service';
import { Suggestion } from 'generated/prisma';

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioClientService: MinioClientService,
  ) {}

  async create(createSuggestionDto: CreateSuggestionDto) {
    const suggestion = await this.prisma.suggestion.create({
      data: createSuggestionDto,
    });
    return this.transformSuggestionWithUrls(suggestion);
  }

  async findAll() {
    const suggestions = await this.prisma.suggestion.findMany({
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      suggestions.map((s) => this.transformSuggestionWithUrls(s)),
    );
  }

  async findActive() {
    const now = new Date();
    const suggestions = await this.prisma.suggestion.findMany({
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
    return Promise.all(
      suggestions.map((s) => this.transformSuggestionWithUrls(s)),
    );
  }

  async findOne(id: string) {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id },
    });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    return this.transformSuggestionWithUrls(suggestion);
  }

  async update(id: string, updateSuggestionDto: UpdateSuggestionDto) {
    await this.findOne(id);
    const updated = await this.prisma.suggestion.update({
      where: { id },
      data: updateSuggestionDto,
    });
    return this.transformSuggestionWithUrls(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.suggestion.delete({
      where: { id },
    });
  }

  private async transformSuggestionWithUrls(suggestion: Suggestion): Promise<Suggestion> {
    const transformed = { ...suggestion };

    if (suggestion.backgroundImage) {
      transformed.backgroundImage = await this.minioClientService.getPresignedUrl(
        suggestion.backgroundImage,
      );
    }

    if (suggestion.icons && suggestion.icons.length > 0) {
      transformed.icons = await Promise.all(
        suggestion.icons.map((icon) =>
          this.minioClientService.getPresignedUrl(icon),
        ),
      );
    }

    return transformed;
  }
}
