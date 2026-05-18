import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ActivityLogItemDto } from '../api-responses';
import { ApiEnvelope } from '../common/swagger/api-envelope.swagger';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityLogFiltersDto } from './dto/activity-log-filters.dto';
import { ORG_MEMBERS, Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Activity logs')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogs: ActivityLogsService) {}

  @Get('orgs/:orgId/activity')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List activity for an organization' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelope(ActivityLogItemDto, { isArray: true, paginatedList: true })
  listForOrg(
    @Param('orgId') orgId: string,
    @Query() query: ActivityLogFiltersDto,
  ) {
    return this.activityLogs.listForOrg(orgId, query);
  }

  @Get('cards/:cardId/activity')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List activity for a card' })
  @ApiParam({ name: 'cardId' })
  @ApiEnvelope(ActivityLogItemDto, { isArray: true, paginatedList: true })
  listForCard(
    @Param('cardId') cardId: string,
    @Query() query: ActivityLogFiltersDto,
  ) {
    return this.activityLogs.listForCard(cardId, query);
  }
}
