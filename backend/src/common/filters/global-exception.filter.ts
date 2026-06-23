import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      
      // If validation error from ClassValidator, it is usually an array of strings in res.message
      if (res && typeof res === 'object') {
        message = res.message || JSON.stringify(res);
        error = res.error || 'Bad Request';
      } else {
        message = res || exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma database constraints cleanly
      switch (exception.code) {
        case 'P2002': // Unique constraint violation (e.g. email)
          status = HttpStatus.CONFLICT;
          const targets = exception.meta?.target as string[] | undefined;
          message = targets 
            ? `A record with this ${targets.join(', ')} already exists.` 
            : 'Unique constraint failed.';
          error = 'Conflict';
          break;
        case 'P2025': // Record not found for relation or delete
          status = HttpStatus.NOT_FOUND;
          message = (exception.meta?.cause as string) || 'Resource not found.';
          error = 'Not Found';
          break;
        case 'P2003': // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed. Related record not found.';
          error = 'Bad Request';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Database query failed: ${exception.message}`;
          error = 'Bad Request';
          break;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      message = exception.message;
    } else {
      this.logger.error('Unknown exception caught', exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
