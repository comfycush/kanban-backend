import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { EnvelopeExceptionFilter } from './../src/common/filters/envelope-exception.filter';
import { ResponseEnvelopeInterceptor } from './../src/common/interceptors/response-envelope.interceptor';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(reflector));
    app.useGlobalFilters(new EnvelopeExceptionFilter());
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          data: string;
          meta: { success: boolean; status: number; pagination: null };
        };
        expect(body.data).toBe('Hello World!');
        expect(body.meta).toBeDefined();
        expect(body.meta.success).toBe(true);
        expect(body.meta.status).toBe(200);
        expect(body.meta.pagination).toBeNull();
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
