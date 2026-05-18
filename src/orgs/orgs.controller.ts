import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrgsService } from './orgs.service';
import {
  MembershipWithOrgDto,
  MembershipWithUserDto,
  OrganizationDto,
  OrgWithMembershipsAndUsersDto,
} from '../api-responses';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { Roles, ORG_MEMBERS } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ApiEnvelope,
  ApiEnvelopeCreated,
} from '../common/swagger/api-envelope.swagger';

@ApiTags('Organizations')
@ApiBearerAuth('JWT')
@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization' })
  @ApiEnvelopeCreated(OrgWithMembershipsAndUsersDto)
  create(@CurrentUser() user: Express.User, @Body() dto: CreateOrgDto) {
    return this.orgsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations for the current user' })
  @ApiEnvelope(MembershipWithOrgDto, { isArray: true })
  list(@CurrentUser() user: Express.User) {
    return this.orgsService.listForUser(user.id);
  }

  @Get(':orgId/members')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List members of the organization' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelope(MembershipWithUserDto, { isArray: true })
  listMembers(@Param('orgId') orgId: string) {
    return this.orgsService.listMembers(orgId);
  }

  @Get(':orgId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Get organization by id' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelope(OrganizationDto)
  get(@Param('orgId') orgId: string) {
    return this.orgsService.getOrg(orgId);
  }

  @Post(':orgId/invite')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Invite a user to the organization (admin)' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelopeCreated(MembershipWithUserDto)
  invite(
    @Param('orgId') orgId: string,
    @CurrentUser() user: Express.User,
    @Body() dto: InviteUserDto,
  ) {
    return this.orgsService.invite(orgId, user.id, dto);
  }

  @Patch(':orgId/members/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update a member's role (admin only)" })
  @ApiParam({ name: 'orgId' })
  @ApiParam({ name: 'userId' })
  @ApiEnvelope(MembershipWithUserDto)
  updateMemberRole(
    @CurrentUser() user: Express.User,
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(orgId, user.id, userId, dto);
  }

  @Delete(':orgId/members/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a member (admin)' })
  @ApiParam({ name: 'orgId' })
  @ApiParam({ name: 'userId' })
  @ApiEnvelope(null, { dataNull: true, description: 'Member removed' })
  removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: Express.User,
  ) {
    return this.orgsService.removeMember(orgId, userId, user.id);
  }

  @Delete(':orgId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete organization (admin)' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelope(null, { dataNull: true, description: 'Organization deleted' })
  delete(@Param('orgId') orgId: string) {
    return this.orgsService.deleteOrg(orgId);
  }
}
