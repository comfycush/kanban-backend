import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { MessageWithUserDto } from '../api-responses';
import { ORG_MEMBERS, Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeCreated,
} from '../common/swagger/api-envelope.swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageFiltersDto } from './dto/message-filters.dto';

@ApiTags('Messages')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post('orgs/:orgId/messages')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Post an org message' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelopeCreated(MessageWithUserDto)
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: Express.User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messages.create(orgId, user.id, user.email, dto);
  }

  @Get('orgs/:orgId/messages')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List org messages (paginated)' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelope(MessageWithUserDto, { isArray: true, paginatedList: true })
  list(@Param('orgId') orgId: string, @Query() query: MessageFiltersDto) {
    return this.messages.listForOrg(orgId, query);
  }
}
