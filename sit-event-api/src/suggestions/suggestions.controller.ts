import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SuggestionsService } from './suggestions.service';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { Public } from 'nest-keycloak-connect';
import { AdminOnly } from '../common';
import { MinioClientService } from '../minio/minio-client.service';

@Controller('suggestions')
export class SuggestionsController {
  constructor(
    private readonly suggestionsService: SuggestionsService,
    private readonly minioClientService: MinioClientService
  ) {}

  @Post()
  @AdminOnly()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'backgroundImage', maxCount: 1 },
      { name: 'icons', maxCount: 10 },
    ]),
  )
  async create(
    @UploadedFiles() files: { backgroundImage?: Express.Multer.File[], icons?: Express.Multer.File[] },
    @Body() createSuggestionDto: CreateSuggestionDto
  ) {
    let bgImage = createSuggestionDto.backgroundImage;
    if (files && files.backgroundImage && files.backgroundImage.length > 0) {
      const uploadResult = await this.minioClientService.uploadFile(files.backgroundImage[0]);
      bgImage = uploadResult.fileName;
    }

    let iconFiles = createSuggestionDto.icons || [];
    if (!Array.isArray(iconFiles)) {
      iconFiles = [iconFiles];
    }
    
    if (files && files.icons && files.icons.length > 0) {
      const uploadPromises = files.icons.map(file => this.minioClientService.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      iconFiles = [...iconFiles, ...results.map(res => res.fileName)];
    }

    return this.suggestionsService.create({
      ...createSuggestionDto,
      backgroundImage: bgImage,
      icons: iconFiles.filter(Boolean),
    });
  }

  @Get()
  @AdminOnly()
  findAll() {
    return this.suggestionsService.findAll();
  }

  @Get('active')
  @Public()
  findActive() {
    return this.suggestionsService.findActive();
  }

  @Get(':id')
  @AdminOnly()
  findOne(@Param('id') id: string) {
    return this.suggestionsService.findOne(id);
  }

  @Patch(':id')
  @AdminOnly()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'backgroundImage', maxCount: 1 },
      { name: 'icons', maxCount: 10 },
    ]),
  )
  async update(
    @Param('id') id: string, 
    @UploadedFiles() files: { backgroundImage?: Express.Multer.File[], icons?: Express.Multer.File[] },
    @Body() updateSuggestionDto: UpdateSuggestionDto
  ) {
    let bgImage = updateSuggestionDto.backgroundImage;
    if (files && files.backgroundImage && files.backgroundImage.length > 0) {
      const uploadResult = await this.minioClientService.uploadFile(files.backgroundImage[0]);
      bgImage = uploadResult.fileName;
    }

    let iconFiles = updateSuggestionDto.icons;
    if (iconFiles && !Array.isArray(iconFiles)) {
      iconFiles = [iconFiles];
    }
    
    if (files && files.icons && files.icons.length > 0) {
      const uploadPromises = files.icons.map(file => this.minioClientService.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      iconFiles = [...(iconFiles || []), ...results.map(res => res.fileName)];
    }

    const updateData = { ...updateSuggestionDto };
    if (bgImage !== undefined) updateData.backgroundImage = bgImage;
    if (iconFiles !== undefined) updateData.icons = iconFiles.filter(Boolean);

    return this.suggestionsService.update(id, updateData);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id') id: string) {
    return this.suggestionsService.remove(id);
  }
}
