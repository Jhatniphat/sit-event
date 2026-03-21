import { Test, TestingModule } from '@nestjs/testing';
import { ScopesController } from './scopes.controller';

describe('ScopesController', () => {
  let controller: ScopesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScopesController],
    }).compile();

    controller = module.get<ScopesController>(ScopesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
