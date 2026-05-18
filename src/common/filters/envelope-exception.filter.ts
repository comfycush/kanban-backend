import {
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ArgumentsHost, Catch } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class EnvelopeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(EnvelopeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (res.headersSent) {
      return;
    }

    const status = this.getStatus(exception);
    const message = this.getMessage(exception, status);

    if (status === 500) {
      this.logger.error(
        `${request.method} ${request.url} — ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        success: false,
        message,
        status,
        pagination: null,
      },
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002' || exception.code === 'P2003') {
        return HttpStatus.CONFLICT;
      }
      if (exception.code === 'P2025') {
        return HttpStatus.NOT_FOUND;
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const r = exception.getResponse();
      if (typeof r === 'string') {
        return r;
      }
      if (r !== null && typeof r === 'object') {
        const o = r as Record<string, unknown>;
        if (Array.isArray(o['message'])) {
          return o['message'].map(String).join(', ');
        }
        if (typeof o['message'] === 'string') {
          return o['message'];
        }
        if (typeof o['error'] === 'string') {
          return o['error'];
        }
      }
      return exception.message;
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return 'Database request failed';
    }
    if (status === 500) {
      return 'Internal server error';
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Error';
  }
}
