import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { EventFormsService } from './event-forms.service';
import {
  CreateEventFormDto,
  CreateFormFieldDto,
  UpdateEventFormDto,
  UpdateFormFieldDto,
  SubmitFormDto,
  ReorderFieldsDto,
  BulkDeleteFieldsDto,
} from './dto';
import {
  AllRoleAccess,
  EventOrganizerAccess,
  CurrentUser,
  type AuthenticatedUser,
} from '../common';
import { UsersService } from '../users/users.service';
import { FormType } from 'generated/prisma';

@ApiTags('Event Forms')
@Controller('events/:eventId/forms')
export class EventFormsController {
  constructor(
    private readonly eventFormsService: EventFormsService,
    private readonly usersService: UsersService,
  ) {}

  // ==================== FORM ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Create a new form for an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 201,
    description: 'Form successfully created.',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Event already has a form.',
  })
  createForm(
    @Param('eventId') eventId: string,
    @Body() dto: CreateEventFormDto,
  ) {
    return this.eventFormsService.createForm(eventId, dto);
  }

  @Get()
  @AllRoleAccess()
  @ApiOperation({ summary: 'Get the form for an event (users must have attended for POST_EVENT, admin/organizer can access anytime)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiQuery({ name: 'type', enum: FormType, required: false, description: 'Filter by form type (PRE_EVENT or POST_EVENT)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the event form(s) or null if not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'User has not attended this event (for POST_EVENT form).',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found.',
  })
  async getFormByEvent(
    @Param('eventId') eventId: string,
    @Query('type') type: FormType,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dbUser = await this.usersService.findByEmail(user.email);
    if (!dbUser) {
      throw new NotFoundException(
        `User with email '${user.email}' not found in database.`,
      );
    }
    const userRoles = user.realm_access?.roles || [];
    return this.eventFormsService.getFormByEvent(eventId, false, dbUser.id, userRoles, type);
  }

  @Get(':formId')
  @AllRoleAccess()
  @ApiOperation({ summary: 'Get a specific form by ID (users must have attended, admin/organizer can access anytime)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the form details.',
  })
  @ApiResponse({
    status: 403,
    description: 'User has not attended this event.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found.',
  })
  async getFormById(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dbUser = await this.usersService.findByEmail(user.email);
    if (!dbUser) {
      throw new NotFoundException(
        `User with email '${user.email}' not found in database.`,
      );
    }
    const userRoles = user.realm_access?.roles || [];
    return this.eventFormsService.getFormById(formId, eventId, dbUser.id, userRoles);
  }

  @Patch(':formId')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Update a form' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Form successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found.',
  })
  updateForm(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @Body() dto: UpdateEventFormDto,
  ) {
    return this.eventFormsService.updateForm(eventId, formId, dto);
  }

  @Delete(':formId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Delete a form' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 204,
    description: 'Form successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found.',
  })
  deleteForm(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
  ) {
    return this.eventFormsService.deleteForm(eventId, formId);
  }

  // ==================== FIELD ENDPOINTS ====================

  @Post(':formId/fields')
  @HttpCode(HttpStatus.CREATED)
  @EventOrganizerAccess()
  @ApiOperation({
    summary: 'Add fields to a form (supports single or bulk)',
    description:
      'You can send a single field object or an array of field objects to add multiple fields at once.',
  })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiBody({
    description: 'Single field or array of fields',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/CreateFormFieldDto' },
        {
          type: 'array',
          items: { $ref: '#/components/schemas/CreateFormFieldDto' },
        },
      ],
    },
    examples: {
      singleField: {
        summary: 'Single field',
        value: {
          question: 'How was the event?',
          fieldType: 'RATING_SCALE',
          isRequired: true,
          order: 1,
        },
      },
      multipleFields: {
        summary: 'Multiple fields (bulk)',
        value: [
          {
            question: 'How was the event?',
            fieldType: 'RATING_SCALE',
            isRequired: true,
            order: 1,
          },
          {
            question: 'Which topics interest you?',
            fieldType: 'CHECKBOX',
            options: ['AI', 'Web Dev', 'Mobile'],
            isRequired: false,
            order: 2,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Field(s) successfully added.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid field data (e.g., CHECKBOX/RADIO without options).',
  })
  addFields(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @Body() dto: CreateFormFieldDto | CreateFormFieldDto[],
  ) {
    return this.eventFormsService.addFields(eventId, formId, dto);
  }

  @Patch(':formId/fields/:fieldId')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Update a specific field' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiParam({ name: 'fieldId', description: 'Field ID' })
  @ApiResponse({
    status: 200,
    description: 'Field successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Field not found.',
  })
  updateField(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateFormFieldDto,
  ) {
    return this.eventFormsService.updateField(eventId, formId, fieldId, dto);
  }

  @Delete(':formId/fields/:fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Delete a specific field' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiParam({ name: 'fieldId', description: 'Field ID' })
  @ApiResponse({
    status: 204,
    description: 'Field successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Field not found.',
  })
  deleteField(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @Param('fieldId') fieldId: string,
  ) {
    return this.eventFormsService.deleteField(eventId, formId, fieldId);
  }

  @Delete(':formId/fields')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Bulk delete multiple fields' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Fields successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form or fields not found.',
  })
  bulkDeleteFields(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @Body() dto: BulkDeleteFieldsDto,
  ) {
    return this.eventFormsService.bulkDeleteFields(eventId, formId, dto);
  }

  @Patch(':formId/fields/reorder')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Reorder form fields' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Fields successfully reordered.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found.',
  })
  reorderFields(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @Body() dto: ReorderFieldsDto,
  ) {
    return this.eventFormsService.reorderFields(eventId, formId, dto);
  }

  // ==================== SUBMISSION ENDPOINTS ====================

  @Post(':formId/submit')
  @HttpCode(HttpStatus.CREATED)
  @AllRoleAccess()
  @ApiOperation({ summary: 'Submit form answers' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 201,
    description: 'Form successfully submitted.',
  })
  @ApiResponse({
    status: 400,
    description: 'Form not active or required fields missing.',
  })
  @ApiResponse({
    status: 409,
    description: 'User already submitted this form.',
  })
  async submitForm(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitFormDto,
  ) {
    const dbUser = await this.usersService.findByEmail(user.email);
    if (!dbUser) {
      throw new NotFoundException(
        `User with email '${user.email}' not found in database.`,
      );
    }
    return this.eventFormsService.submitForm(eventId, formId, dbUser.id, dto);
  }

  @Get(':formId/my-submission')
  @AllRoleAccess()
  @ApiOperation({ summary: 'Get my submission for this form' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns user submission or null.',
  })
  async getMySubmission(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dbUser = await this.usersService.findByEmail(user.email);
    if (!dbUser) {
      throw new NotFoundException(
        `User with email '${user.email}' not found in database.`,
      );
    }
    return this.eventFormsService.getMySubmission(eventId, formId, dbUser.id);
  }

  @Get(':formId/submissions')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Get all submissions for a form (organizers only)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all form submissions.',
  })
  getAllSubmissions(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
  ) {
    return this.eventFormsService.getAllSubmissions(eventId, formId);
  }

  @Get(':formId/submissions/:submissionId')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Get a specific submission by ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the submission details.',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found.',
  })
  getSubmissionById(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.eventFormsService.getSubmissionById(eventId, formId, submissionId);
  }

  @Get(':formId/summary')
  @EventOrganizerAccess()
  @ApiOperation({ summary: 'Get form submission summary/statistics' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns form statistics and summary.',
  })
  getFormSummary(
    @Param('eventId') eventId: string,
    @Param('formId') formId: string,
  ) {
    return this.eventFormsService.getFormSummary(eventId, formId);
  }
}
