import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { BoardsService } from './boards.service';
import { BoardDto, BoardWithColumnsAndCardsDto } from '../api-responses';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ORG_MEMBERS, Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ApiEnvelope,
  ApiEnvelopeCreated,
} from '../common/swagger/api-envelope.swagger';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@ApiTags('Boards')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post('orgs/:orgId/boards')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a board (org admin)' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelopeCreated(BoardDto)
  create(@Param('orgId') orgId: string, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(orgId, dto);
  }

  @Get('orgs/:orgId/boards')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List boards in an organization' })
  @ApiParam({ name: 'orgId' })
  @ApiEnvelope(BoardDto, { isArray: true })
  list(@Param('orgId') orgId: string) {
    return this.boardsService.listByOrg(orgId);
  }

  @Get('boards/:boardId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Get board with columns and cards' })
  @ApiParam({ name: 'boardId' })
  @ApiEnvelope(BoardWithColumnsAndCardsDto)
  get(@Param('boardId') boardId: string, @Req() req: Request) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Board not found');
    }
    return this.boardsService.getWithDetails(boardId, orgId);
  }

  @Patch('boards/:boardId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update board (org admin)' })
  @ApiParam({ name: 'boardId' })
  @ApiEnvelope(BoardDto)
  update(
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Board not found');
    }
    return this.boardsService.update(boardId, orgId, dto);
  }

  @Delete('boards/:boardId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete board (org admin)' })
  @ApiParam({ name: 'boardId' })
  @ApiEnvelope(BoardDto)
  delete(@Param('boardId') boardId: string, @Req() req: Request) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Board not found');
    }
    return this.boardsService.delete(boardId, orgId);
  }
}
