import { Test, TestingModule } from '@nestjs/testing';
import { EventStaffsController } from './event-staffs.controller';
import { EventStaffsService } from './event-staffs.service';

describe('EventStaffsController', () => {
  let controller: EventStaffsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventStaffsController],
      providers: [EventStaffsService],
    }).compile();

    controller = module.get<EventStaffsController>(EventStaffsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
