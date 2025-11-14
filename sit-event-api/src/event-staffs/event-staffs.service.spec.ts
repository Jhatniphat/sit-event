import { Test, TestingModule } from '@nestjs/testing';
import { EventStaffsService } from './event-staffs.service';

describe('EventStaffsService', () => {
  let service: EventStaffsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStaffsService],
    }).compile();

    service = module.get<EventStaffsService>(EventStaffsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
