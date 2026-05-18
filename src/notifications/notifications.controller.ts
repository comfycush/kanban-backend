import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  NotificationItemDto,
  PrismaUpdateManyResultDto,
} from '../api-responses';
import { ApiEnvelope } from '../common/swagger/api-envelope.swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationFiltersDto } from './dto/notification-filters.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiEnvelope(NotificationItemDto, { isArray: true, paginatedList: true })
  list(
    @CurrentUser() user: Express.User,
    @Query() query: NotificationFiltersDto,
  ) {
    return this.notificationsService.listForUser(user.id, query);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiParam({ name: 'id' })
  @ApiEnvelope(NotificationItemDto)
  markRead(@CurrentUser() user: Express.User, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiEnvelope(PrismaUpdateManyResultDto)
  markAllRead(@CurrentUser() user: Express.User) {
    return this.notificationsService.markAllRead(user.id);
  }
}
