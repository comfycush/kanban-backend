import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';
import { Stream } from 'node:stream';
import { buildPagination, isPaginatedList } from '../http/paginated-list';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseEnvelopeInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (this.shouldPassthrough(data)) {
          return data;
        }
        const http = context.switchToHttp();
        const res = http.getResponse<Response>();
        const req = http.getRequest<Request>();
        const status = this.resolveStatus(context, res, req);
        if (isPaginatedList<unknown>(data)) {
          const { items, total, skip, take } = data;
          return {
            data: items,
            meta: {
              timestamp: new Date().toISOString(),
              success: true,
              message: 'OK',
              status,
              pagination: buildPagination(total, skip, take),
            },
          };
        }
        return {
          data: data === undefined ? null : data,
          meta: {
            timestamp: new Date().toISOString(),
            success: true,
            message: 'OK',
            status,
            pagination: null,
          },
        };
      }),
    );
  }

  private resolveStatus(
    context: ExecutionContext,
    res: Response,
    req: Request,
  ): number {
    const fromHttpCode = this.reflector.getAllAndOverride<number>(
      HTTP_CODE_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (fromHttpCode !== undefined) {
      return fromHttpCode;
    }
    if (res.statusCode && res.statusCode !== 200) {
      return res.statusCode;
    }
    return req.method === 'POST' ? 201 : 200;
  }

  private shouldPassthrough(data: unknown): boolean {
    if (data == null) {
      return false;
    }
    if (data instanceof Stream) {
      this.logger.debug('Skip envelope for stream');
      return true;
    }
    return false;
  }
}
