import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'A record with the same unique value already exists',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Referenced record does not exist',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
  P2000: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Value too long for the column',
  },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        message = (r.message as string) ?? message;
        errors = Array.isArray(r.message) ? r.message : undefined;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      if (mapped) {
        status = mapped.status;
        message = mapped.message;
      }
    } else if (exception instanceof Error) {
      message = 'Internal server error';
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
