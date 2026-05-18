import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shipped inside `meta` for list endpoints that support skip/take.
 */
export class ApiMetaPaginationDto {
  @ApiProperty({ description: '1-based page index' })
  page: number;

  @ApiProperty({ description: 'Page size (same as `take` query param)' })
  limit: number;

  @ApiProperty() total: number;

  @ApiProperty() totalPages: number;
}

/**
 * Every successful HTTP response includes `meta` with this shape.
 * `pagination` is set for paginated list endpoints; otherwise `null`.
 */
export class ApiMetaDto {
  @ApiProperty({ example: '2026-04-24T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty() success: boolean;

  @ApiProperty({ example: 'OK' })
  message: string;

  @ApiProperty({ description: 'HTTP status code' })
  status: number;

  @ApiPropertyOptional({ type: () => ApiMetaPaginationDto, nullable: true })
  pagination: ApiMetaPaginationDto | null;
}
