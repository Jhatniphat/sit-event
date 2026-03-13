import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificates.service';
import { PrismaService } from '../prisma.service';
import { MinioClientService } from '../minio/minio-client.service';
import { FieldType } from '../../generated/prisma';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let prisma: PrismaService;
  let minio: MinioClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        {
          provide: PrismaService,
          useValue: {
            certificateTemplate: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            certificateElement: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: MinioClientService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getPresignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    prisma = module.get<PrismaService>(PrismaService);
    minio = module.get<MinioClientService>(MinioClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should upload file and create template', async () => {
      const dto = { eventId: 'event-123' };
      const file = { buffer: Buffer.from('test') } as any;

      jest.spyOn(minio, 'uploadFile').mockResolvedValue({ fileName: 'test.jpg' });
      jest.spyOn(prisma.certificateTemplate, 'create').mockResolvedValue({
        id: '1',
        eventId: dto.eventId,
        templateFilepath: 'test.jpg'
      } as any);

      const result = await service.createTemplate(dto, file);

      expect(minio.uploadFile).toHaveBeenCalledWith(file);
      expect(prisma.certificateTemplate.create).toHaveBeenCalledWith({
        data: { eventId: dto.eventId, templateFilepath: 'test.jpg' },
      });
      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });
  });

  describe('createElement', () => {
    it('should create element with image upload', async () => {
      const dto = {
        templateId: 'tmpl-1',
        fieldName: 'Sig',
        fieldType: FieldType.Image,
        x: 10,
        y: 10
      };
      const file = { buffer: Buffer.from('sig') } as any;

      jest.spyOn(minio, 'uploadFile').mockResolvedValue({ fileName: 'sig.png' });
      jest.spyOn(prisma.certificateElement, 'create').mockResolvedValue({ id: '1', ...dto, sourceFilepath: 'sig.png' } as any);

      const result = await service.createElement(dto, file);

      expect(minio.uploadFile).toHaveBeenCalledWith(file);
      expect(prisma.certificateElement.create).toHaveBeenCalled();
      expect(result).toHaveProperty('sourceFilepath', 'sig.png');
    });
  });
});