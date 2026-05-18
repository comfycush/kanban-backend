import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MembershipsService } from './memberships.service';
import { MembershipWithOrgDto } from '../api-responses';
import { ApiEnvelope } from '../common/swagger/api-envelope.swagger';

@ApiTags('Memberships')
@ApiBearerAuth('JWT')
@Controller('memberships')
@UseGuards(JwtAuthGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('me')
  @ApiOperation({
    summary:
      'List memberships for the current user (resolved from the access token)',
  })
  @ApiEnvelope(MembershipWithOrgDto, { isArray: true })
  listMine(@CurrentUser() user: Express.User) {
    return this.membershipsService.listForUser(user.id);
  }

  @Get(':orgId')
  @ApiOperation({
    summary:
      "Get this user's membership in an organization (resolved from the access token)",
  })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelope(MembershipWithOrgDto)
  getMineForOrg(
    @CurrentUser() user: Express.User,
    @Param('orgId') orgId: string,
  ) {
    return this.membershipsService.findForUserAndOrg(user.id, orgId);
  }
}
