import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { FieldType } from '@prisma/client';

describe('CertificatesController', () => {
  let controller: CertificatesController;
  let service: CertificatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificatesController],
      providers: [
        {
          provide: CertificatesService,
          useValue: {
            createTemplate: jest.fn(),
            findAllTemplates: jest.fn(),
            createElement: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
    service = module.get<CertificatesService>(CertificatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.createTemplate', async () => {
    const dto = { eventId: '1' };
    const file = {} as any;
    await controller.createTemplate(dto, file);
    expect(service.createTemplate).toHaveBeenCalledWith(dto, file);
  });

  it('should call service.createElement', async () => {
    const dto = { 
        templateId: '1', 
        fieldName: 'test', 
        fieldType: FieldType.Text, 
        x: 0, 
        y: 0 
    };
    await controller.createElement(dto, undefined);
    expect(service.createElement).toHaveBeenCalledWith(dto, undefined);
  });
});