import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      this.logger.log(
        `${method} ${originalUrl} ${res.statusCode} ${durationMs}ms ${ip}`,
      );
    });

    next();
  }
}
