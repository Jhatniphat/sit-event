import { Test, TestingModule } from '@nestjs/testing';
import { EventSessionsController } from './event-sessions.controller';
import { EventSessionsService } from './event-sessions.service';

describe('EventSessionsController', () => {
  let controller: EventSessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventSessionsController],
      providers: [EventSessionsService],
    }).compile();

    controller = module.get<EventSessionsController>(EventSessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
