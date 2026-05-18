import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ApiMetaDto,
  ApiMetaPaginationDto,
} from './api-responses/api-envelope.dto';
import { AppModule } from './app.module';
import { EnvelopeExceptionFilter } from './common/filters/envelope-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalInterceptors(
    new ResponseEnvelopeInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(new EnvelopeExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Kanban API')
    .setDescription(
      'HTTP API for organizations, boards, cards, and messaging.\n\n' +
        '**Response envelope** — every response body is `{ data, meta }` where `meta` includes `timestamp` (ISO 8601), `success`, `message`, `status` (HTTP code), and `pagination` (object with `page`, `limit`, `total`, `totalPages` for paginated list endpoints, or `null` otherwise). Errors use the same envelope with `data: null` and `success: false`.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiMetaDto, ApiMetaPaginationDto],
  });
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
