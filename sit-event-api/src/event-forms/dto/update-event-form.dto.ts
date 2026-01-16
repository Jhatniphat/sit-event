import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEventFormDto, CreateFormFieldDto } from './create-event-form.dto';

export class UpdateEventFormDto extends PartialType(
  OmitType(CreateEventFormDto, ['fields'] as const),
) {}

export class UpdateFormFieldDto extends PartialType(CreateFormFieldDto) {}
