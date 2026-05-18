import { Type, applyDecorators } from '@nestjs/common';
import { getSchemaPath } from '@nestjs/swagger';
import { ApiResponse } from '@nestjs/swagger';
import { ApiMetaDto } from '../../api-responses/api-envelope.dto';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const metaRef = { $ref: getSchemaPath(ApiMetaDto) };

type EnvelopeOptions = {
  status?: number;
  description?: string;
  isArray?: boolean;
  /**
   * List endpoints with skip/take; response `data` is an array and `meta.pagination` is set at runtime.
   */
  paginatedList?: boolean;
  /** `data: null` (e.g. successful DELETE with no body) */
  dataNull?: boolean;
  /** Raw string `data` (e.g. health root) */
  dataString?: boolean;
  /** `data: object` for arbitrary JSON */
  dataObject?: boolean;
};

function dataSchema(
  dataClass: Type<unknown> | null,
  o: EnvelopeOptions,
): SchemaObject {
  if (o.dataNull) {
    return {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: { type: 'null' },
        meta: metaRef,
      },
    };
  }
  if (o.dataString) {
    return {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: { type: 'string', example: 'Hello World!' },
        meta: metaRef,
      },
    };
  }
  if (o.dataObject) {
    return {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: { type: 'object', additionalProperties: true },
        meta: metaRef,
      },
    };
  }
  if (!dataClass) {
    return {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: { type: 'object' },
        meta: metaRef,
      },
    };
  }
  if (o.isArray || o.paginatedList) {
    return {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(dataClass) },
        },
        meta: metaRef,
      },
    };
  }
  return {
    type: 'object',
    required: ['data', 'meta'],
    properties: {
      data: { $ref: getSchemaPath(dataClass) },
      meta: metaRef,
    },
  };
}

/**
 * 200/201 (default 200) — documents `{ data, meta }` for Swagger.
 * Use `paginatedList: true` for list endpoints with query pagination; runtime fills `meta.pagination`.
 */
export function ApiEnvelope(
  dataClass: Type<unknown> | null,
  options: EnvelopeOptions = {},
) {
  const { status, description, ...rest } = options;
  return applyDecorators(
    ApiResponse({
      status: status ?? 200,
      description,
      schema: dataSchema(dataClass, rest),
    }),
  );
}

/**
 * 201 Created — same envelope as {@link ApiEnvelope}.
 */
export function ApiEnvelopeCreated(
  dataClass: Type<unknown> | null,
  options: Omit<EnvelopeOptions, 'status'> = {},
) {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description: options.description,
      schema: dataSchema(dataClass, options),
    }),
  );
}

export { ApiMetaDto };
