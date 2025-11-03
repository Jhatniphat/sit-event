import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Log the original exception for debugging
    this.logger.error('Exception caught:', exception);

    if (exception instanceof HttpException) {
      // NestJS HTTP exceptions (400, 401, 404, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      // Prisma database errors
      ({ status, message, error } = this.handlePrismaError(exception));
    } else if (exception instanceof PrismaClientValidationError) {
      // Prisma validation errors (เช่น missing required field)
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'Validation Error';
    } else if (exception instanceof Error) {
      // General JavaScript errors
      message = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : exception.message;
      error = exception.name;
    }

    // Response format
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    };

    // Log สำหรับ server monitoring
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }

  /**
   * แปลง Prisma error codes เป็น HTTP status และ user-friendly messages
   */
  private handlePrismaError(exception: PrismaClientKnownRequestError) {
    const { code, meta } = exception;

    switch (code) {
      case 'P2002':
        // Unique constraint violation
        const field = meta?.target ? (meta.target as string[]).join(', ') : 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `${field} already exists`,
          error: 'Conflict',
        };

      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related record',
          error: 'Foreign Key Constraint',
        };

      case 'P2014':
        // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid relation data provided',
          error: 'Relation Error',
        };

      case 'P2021':
        // Table does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database schema error',
          error: 'Schema Error',
        };

      case 'P2022':
        // Column does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database schema error',
          error: 'Schema Error',
        };

      default:
        // Unknown Prisma error
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: process.env.NODE_ENV === 'production'
            ? 'Database operation failed'
            : exception.message,
          error: 'Database Error',
        };
    }
  }
}