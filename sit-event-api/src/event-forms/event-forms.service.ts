import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  EventForm,
  EventFormField,
  EventFormSubmission,
  FormFieldType,
  FormType,
} from 'generated/prisma';
import {
  CreateEventFormDto,
  CreateFormFieldDto,
  UpdateEventFormDto,
  UpdateFormFieldDto,
  SubmitFormDto,
  ReorderFieldsDto,
  BulkDeleteFieldsDto,
} from './dto';

@Injectable()
export class EventFormsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== FORM MANAGEMENT ====================

  /**
   * Create a new form for an event
   */
  async createForm(eventId: string, dto: CreateEventFormDto): Promise<EventForm> {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    const type = dto.type || FormType.POST_EVENT;

    // Check if event already has a form of this type
    const existingForm = await this.prisma.eventForm.findFirst({
      where: { eventId, type },
    });

    if (existingForm) {
      throw new ConflictException(
        `Event with ID '${eventId}' already has a ${type} form.`,
      );
    }

    // Validate fields if provided
    if (dto.fields) {
      this.validateFields(dto.fields);
    }

    // Create form with optional fields
    return this.prisma.eventForm.create({
      data: {
        eventId,
        type,
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive ?? false,
        fields: dto.fields
          ? {
              create: dto.fields.map((field, index) => ({
                question: field.question,
                fieldType: field.fieldType,
                options: field.options ?? [],
                isRequired: field.isRequired ?? false,
                order: field.order ?? index,
              })),
            }
          : undefined,
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get form by event ID
   */
  async getFormByEvent(
    eventId: string,
    includeSubmissions = false,
    userId?: string,
    userRoles: string[] = [],
    type?: FormType,
  ): Promise<EventForm | EventForm[] | null> {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    // If userId provided and not ADMIN/ORGANIZER, validate user has attended
    // Note: For PRE_EVENT forms, user might not have attended yet (registration phase)
    if (userId && !this.isAdminOrOrganizer(userRoles)) {
      if (type !== FormType.PRE_EVENT) {
         await this.verifyUserAttended(eventId, userId);
      }
    }

    if (type) {
      const form = await this.prisma.eventForm.findFirst({
        where: { eventId, type },
        include: {
          fields: {
            orderBy: { order: 'asc' },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          submissions: includeSubmissions
            ? {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                  answers: true,
                },
              }
            : false,
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      });
      return form;
    } else {
      const forms = await this.prisma.eventForm.findMany({
        where: { eventId },
        include: {
          fields: {
            orderBy: { order: 'asc' },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          submissions: includeSubmissions
            ? {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                  answers: true,
                },
              }
            : false,
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      });
      return forms;
    }
  }

  /**
   * Get form by ID
   */
  async getFormById(
    formId: string,
    eventId?: string,
    userId?: string,
    userRoles: string[] = [],
  ): Promise<EventForm> {
    const form = await this.prisma.eventForm.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(`Form with ID '${formId}' not found`);
    }

    // If eventId and userId provided and not ADMIN/ORGANIZER, validate user has attended
    if (eventId && userId && !this.isAdminOrOrganizer(userRoles)) {
      await this.verifyUserAttended(eventId, userId);
    }

    return form;
  }

  /**
   * Update form
   */
  async updateForm(
    eventId: string,
    formId: string,
    dto: UpdateEventFormDto,
  ): Promise<EventForm> {
    // Verify form exists and belongs to event
    const form = await this.verifyFormBelongsToEvent(eventId, formId);

    return this.prisma.eventForm.update({
      where: { id: formId },
      data: {
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Delete form
   */
  async deleteForm(eventId: string, formId: string): Promise<void> {
    await this.verifyFormBelongsToEvent(eventId, formId);

    await this.prisma.eventForm.delete({
      where: { id: formId },
    });
  }

  // ==================== FIELD MANAGEMENT ====================

  /**
   * Add fields to form (supports single or bulk)
   */
  async addFields(
    eventId: string,
    formId: string,
    fieldsDto: CreateFormFieldDto | CreateFormFieldDto[],
  ): Promise<EventFormField[]> {
    await this.verifyFormBelongsToEvent(eventId, formId);

    const fields = Array.isArray(fieldsDto) ? fieldsDto : [fieldsDto];
    this.validateFields(fields);

    // Get current max order
    const maxOrderField = await this.prisma.eventFormField.findFirst({
      where: { formId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const startOrder = (maxOrderField?.order ?? -1) + 1;

    // Create fields
    const createdFields: EventFormField[] = [];
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const created = await this.prisma.eventFormField.create({
        data: {
          formId,
          question: field.question,
          fieldType: field.fieldType,
          options: field.options ?? [],
          isRequired: field.isRequired ?? false,
          order: field.order ?? startOrder + i,
        },
      });
      createdFields.push(created);
    }

    return createdFields;
  }

  /**
   * Update a specific field
   */
  async updateField(
    eventId: string,
    formId: string,
    fieldId: string,
    dto: UpdateFormFieldDto,
  ): Promise<EventFormField> {
    await this.verifyFormBelongsToEvent(eventId, formId);
    await this.verifyFieldBelongsToForm(formId, fieldId);

    // Validate if updating fieldType with options
    if (dto.fieldType || dto.options) {
      const currentField = await this.prisma.eventFormField.findUnique({
        where: { id: fieldId },
      });
      const fieldType = dto.fieldType ?? currentField?.fieldType;
      const options = dto.options ?? currentField?.options;

      if (
        (fieldType === FormFieldType.CHECKBOX || fieldType === FormFieldType.RADIO) &&
        (!options || options.length === 0)
      ) {
        throw new BadRequestException(
          `Field type '${fieldType}' requires at least one option`,
        );
      }
    }

    return this.prisma.eventFormField.update({
      where: { id: fieldId },
      data: {
        question: dto.question,
        fieldType: dto.fieldType,
        options: dto.options,
        isRequired: dto.isRequired,
        order: dto.order,
      },
    });
  }

  /**
   * Delete a specific field
   */
  async deleteField(eventId: string, formId: string, fieldId: string): Promise<void> {
    await this.verifyFormBelongsToEvent(eventId, formId);
    await this.verifyFieldBelongsToForm(formId, fieldId);

    await this.prisma.eventFormField.delete({
      where: { id: fieldId },
    });
  }

  /**
   * Bulk delete fields
   */
  async bulkDeleteFields(
    eventId: string,
    formId: string,
    dto: BulkDeleteFieldsDto,
  ): Promise<{ deleted: number }> {
    await this.verifyFormBelongsToEvent(eventId, formId);

    // Verify all fields belong to this form
    const existingFields = await this.prisma.eventFormField.findMany({
      where: {
        id: { in: dto.fieldIds },
        formId,
      },
      select: { id: true },
    });

    const existingIds = existingFields.map((f) => f.id);
    const notFoundIds = dto.fieldIds.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `Fields not found in this form: ${notFoundIds.join(', ')}`,
      );
    }

    const result = await this.prisma.eventFormField.deleteMany({
      where: {
        id: { in: dto.fieldIds },
        formId,
      },
    });

    return { deleted: result.count };
  }

  /**
   * Reorder fields
   */
  async reorderFields(
    eventId: string,
    formId: string,
    dto: ReorderFieldsDto,
  ): Promise<EventFormField[]> {
    await this.verifyFormBelongsToEvent(eventId, formId);

    // Update order for each field
    await Promise.all(
      dto.fields.map((field) =>
        this.prisma.eventFormField.update({
          where: { id: field.id },
          data: { order: field.order },
        }),
      ),
    );

    // Return updated fields in order
    return this.prisma.eventFormField.findMany({
      where: { formId },
      orderBy: { order: 'asc' },
    });
  }

  // ==================== SUBMISSION MANAGEMENT ====================

  /**
   * Submit form answers
   */
  async submitForm(
    eventId: string,
    formId: string,
    userId: string,
    dto: SubmitFormDto,
  ): Promise<EventFormSubmission> {
    const form = await this.verifyFormBelongsToEvent(eventId, formId);

    // Check if form is active
    if (!form.isActive) {
      throw new BadRequestException('This form is not currently accepting submissions');
    }

    // Check if user has attended the event (checked in)
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId,
      },
    });

    if (!registration) {
      throw new ForbiddenException(
        'You must register for this event before submitting the form.',
      );
    }

    // Only require attendance for non-PRE_EVENT forms (e.g. POST_EVENT)
    console.log('Form Type:', form.type);
    console.log('User Registration:', registration);
    if (form.type !== FormType.PRE_EVENT && !registration.attended) {
      throw new ForbiddenException(
        'You must attend (check-in) this event before submitting the feedback form.',
      );
    }

    // Check if user already submitted
    const existingSubmission = await this.prisma.eventFormSubmission.findUnique({
      where: {
        formId_userId: { formId, userId },
      },
    });

    if (existingSubmission) {
      throw new ConflictException('You have already submitted this form');
    }

    // Get all fields to validate required fields
    const fields = await this.prisma.eventFormField.findMany({
      where: { formId },
    });

    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    // Validate required fields
    const requiredFieldIds = fields.filter((f) => f.isRequired).map((f) => f.id);
    const answeredFieldIds = dto.answers
      .filter((a) => a.answer && a.answer.trim() !== '')
      .map((a) => a.fieldId);

    const missingRequired = requiredFieldIds.filter(
      (id) => !answeredFieldIds.includes(id),
    );

    if (missingRequired.length > 0) {
      const missingQuestions = missingRequired
        .map((id) => fieldMap.get(id)?.question)
        .filter(Boolean);
      throw new BadRequestException(
        `Required fields not answered: ${missingQuestions.join(', ')}`,
      );
    }

    // Validate field IDs exist in form
    for (const answer of dto.answers) {
      if (!fieldMap.has(answer.fieldId)) {
        throw new BadRequestException(
          `Field with ID '${answer.fieldId}' does not belong to this form`,
        );
      }
    }

    // Create submission with answers
    return this.prisma.eventFormSubmission.create({
      data: {
        formId,
        userId,
        answers: {
          create: dto.answers.map((answer) => ({
            fieldId: answer.fieldId,
            answer: answer.answer,
          })),
        },
      },
      include: {
        answers: {
          include: {
            field: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get user's own submission
   */
  async getMySubmission(
    eventId: string,
    formId: string,
    userId: string,
  ): Promise<EventFormSubmission | null> {
    await this.verifyFormBelongsToEvent(eventId, formId);

    return this.prisma.eventFormSubmission.findUnique({
      where: {
        formId_userId: { formId, userId },
      },
      include: {
        answers: {
          include: {
            field: true,
          },
        },
      },
    });
  }

  /**
   * Get all submissions for a form (for organizers)
   */
  async getAllSubmissions(
    eventId: string,
    formId: string,
  ): Promise<EventFormSubmission[]> {
    await this.verifyFormBelongsToEvent(eventId, formId);

    return this.prisma.eventFormSubmission.findMany({
      where: { formId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        answers: {
          include: {
            field: {
              select: {
                id: true,
                question: true,
                fieldType: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  /**
   * Get a specific submission by ID
   */
  async getSubmissionById(
    eventId: string,
    formId: string,
    submissionId: string,
  ): Promise<EventFormSubmission> {
    await this.verifyFormBelongsToEvent(eventId, formId);

    const submission = await this.prisma.eventFormSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        answers: {
          include: {
            field: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID '${submissionId}' not found`);
    }

    if (submission.formId !== formId) {
      throw new NotFoundException(
        `Submission with ID '${submissionId}' does not belong to this form`,
      );
    }

    return submission;
  }

  /**
   * Get form summary/statistics
   */
  async getFormSummary(eventId: string, formId: string) {
    const form = await this.verifyFormBelongsToEvent(eventId, formId);

    const fields = await this.prisma.eventFormField.findMany({
      where: { formId },
      orderBy: { order: 'asc' },
    });

    const totalSubmissions = await this.prisma.eventFormSubmission.count({
      where: { formId },
    });

    // Get answer statistics for each field
    const fieldStats = await Promise.all(
      fields.map(async (field) => {
        const answers = await this.prisma.eventFormAnswer.findMany({
          where: { fieldId: field.id },
          select: { answer: true },
        });

        const stats: Record<string, unknown> = {
          fieldId: field.id,
          question: field.question,
          fieldType: field.fieldType,
          totalAnswers: answers.length,
        };

        if (
          field.fieldType === FormFieldType.CHECKBOX ||
          field.fieldType === FormFieldType.RADIO
        ) {
          // Count occurrences of each option
          const optionCounts: Record<string, number> = {};
          field.options.forEach((opt) => (optionCounts[opt] = 0));

          answers.forEach((a) => {
            if (a.answer) {
              // For checkbox, answer might be comma-separated
              const selectedOptions = a.answer.split(',').map((s) => s.trim());
              selectedOptions.forEach((opt) => {
                if (optionCounts[opt] !== undefined) {
                  optionCounts[opt]++;
                }
              });
            }
          });

          stats.optionCounts = optionCounts;
        } else if (field.fieldType === FormFieldType.RATING_SCALE) {
          // Calculate average rating
          const ratings = answers
            .map((a) => parseFloat(a.answer || '0'))
            .filter((n) => !isNaN(n));

          if (ratings.length > 0) {
            stats.averageRating =
              ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
            stats.minRating = Math.min(...ratings);
            stats.maxRating = Math.max(...ratings);
          }
        } else {
          // TEXT type - just count non-empty answers
          stats.answeredCount = answers.filter(
            (a) => a.answer && a.answer.trim() !== '',
          ).length;
        }

        return stats;
      }),
    );

    return {
      formId: form.id,
      formTitle: form.title,
      isActive: form.isActive,
      totalSubmissions,
      fieldStats,
    };
  }

  // ==================== HELPER METHODS ====================

  private async verifyFormBelongsToEvent(
    eventId: string,
    formId: string,
  ): Promise<EventForm> {
    const form = await this.prisma.eventForm.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(`Form with ID '${formId}' not found`);
    }

    if (form.eventId !== eventId) {
      throw new NotFoundException(
        `Form with ID '${formId}' does not belong to event '${eventId}'`,
      );
    }

    return form;
  }

  private async verifyFieldBelongsToForm(
    formId: string,
    fieldId: string,
  ): Promise<EventFormField> {
    const field = await this.prisma.eventFormField.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new NotFoundException(`Field with ID '${fieldId}' not found`);
    }

    if (field.formId !== formId) {
      throw new NotFoundException(
        `Field with ID '${fieldId}' does not belong to form '${formId}'`,
      );
    }

    return field;
  }

  private validateFields(fields: CreateFormFieldDto[]): void {
    for (const field of fields) {
      if (
        (field.fieldType === FormFieldType.CHECKBOX ||
          field.fieldType === FormFieldType.RADIO) &&
        (!field.options || field.options.length === 0)
      ) {
        throw new BadRequestException(
          `Field type '${field.fieldType}' requires at least one option. Question: "${field.question}"`,
        );
      }
    }
  }

  /**
   * Verify that user has registered and attended (checked-in) the event
   */
  private async verifyUserAttended(eventId: string, userId: string): Promise<void> {
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId,
      },
    });

    if (!registration) {
      throw new ForbiddenException(
        'You must register for this event to access the form.',
      );
    }

    if (!registration.attended) {
      throw new ForbiddenException(
        'You must attend (check-in) this event to access the form.',
      );
    }
  }

  /**
   * Check if user has ADMIN or ORGANIZER role
   */
  private isAdminOrOrganizer(userRoles: string[]): boolean {
    return userRoles.includes('ADMIN') || userRoles.includes('ORGANIZER');
  }

  /**
   * Get all forms for the current user with submission status
   * Returns forms from events that the user has attended
   */
  async getMyForms(userId: string): Promise<{
    forms: {
      formId: string;
      eventName: string;
      title: string;
      isSubmitted: boolean;
      submittedAt: Date | null;
    }[];
  }> {
    // Get all events the user has attended (checked-in)
    const attendedRegistrations = await this.prisma.eventRegistration.findMany({
      where: {
        userId,
        attended: true,
      },
      select: {
        eventId: true,
      },
    });

    const attendedEventIds = attendedRegistrations.map((r) => r.eventId);

    if (attendedEventIds.length === 0) {
      return { forms: [] };
    }

    // Get all active forms from attended events
    const forms = await this.prisma.eventForm.findMany({
      where: {
        eventId: { in: attendedEventIds }
      },
      include: {
        event: {
          select: {
            name: true,
          },
        },
        submissions: {
          where: {
            userId,
          },
          select: {
            submittedAt: true,
          },
        },
      },
    });

    // Map to response format
    const result = forms.map((form) => {
      const submission = form.submissions[0]; // User can only have 1 submission per form
      return {
        formId: form.id,
        eventName: form.event.name,
        title: form.title,
        isSubmitted: !!submission,
        submittedAt: submission?.submittedAt || null,
      };
    });

    return { forms: result };
  }
}
