import {
  Controller,
  Get,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { EventFormsService } from './event-forms.service';
import {
  AllRoleAccess,
  CurrentUser,
  type AuthenticatedUser,
} from '../common';
import { UsersService } from '../users/users.service';

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(
    private readonly eventFormsService: EventFormsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  @AllRoleAccess()
  @ApiOperation({
    summary: 'Get all forms for the current user',
    description: 'Returns all forms from events that the user has attended, along with submission status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of forms with submission status.',
    schema: {
      type: 'object',
      properties: {
        forms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              formId: { type: 'string', example: 'uuid-form-id' },
              eventName: { type: 'string', example: 'Tech Conference 2026' },
              title: { type: 'string', example: 'Feedback Form' },
              isSubmitted: { type: 'boolean', example: true },
              submittedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: '2026-01-30T10:00:00.000Z',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  async getMyForms(@CurrentUser() user: AuthenticatedUser) {
    const dbUser = await this.usersService.findByEmail(user.email);
    if (!dbUser) {
      throw new NotFoundException(
        `User with email '${user.email}' not found in database.`,
      );
    }
    return this.eventFormsService.getMyForms(dbUser.id);
  }
}
