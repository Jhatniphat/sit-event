import { Test, TestingModule } from '@nestjs/testing';
import { EventSessionsService } from './event-sessions.service';

describe('EventSessionsService', () => {
  let service: EventSessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventSessionsService],
    }).compile();

    service = module.get<EventSessionsService>(EventSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
