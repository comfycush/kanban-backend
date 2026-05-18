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
import { ColumnDto, ColumnWithCardCountDto } from '../api-responses';
import { ORG_MEMBERS, Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiEnvelope,
  ApiEnvelopeCreated,
} from '../common/swagger/api-envelope.swagger';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@ApiTags('Columns')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Post('boards/:boardId/columns')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Create a column on a board' })
  @ApiParam({ name: 'boardId' })
  @ApiEnvelopeCreated(ColumnDto)
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Board not found');
    }
    return this.columns.create(boardId, orgId, dto);
  }

  @Get('boards/:boardId/columns')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List columns for a board' })
  @ApiParam({ name: 'boardId' })
  @ApiEnvelope(ColumnWithCardCountDto, { isArray: true })
  list(@Param('boardId') boardId: string, @Req() req: Request) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Board not found');
    }
    return this.columns.list(boardId, orgId);
  }

  @Patch('boards/:boardId/columns/reorder')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Reorder columns' })
  @ApiParam({ name: 'boardId' })
  @ApiEnvelope(null, { dataNull: true, description: 'Columns reordered' })
  reorder(
    @Param('boardId') boardId: string,
    @Body() body: ReorderColumnsDto,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Board not found');
    }
    return this.columns.reorder(boardId, orgId, body);
  }

  @Patch('boards/:boardId/columns/:columnId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Update a column' })
  @ApiParam({ name: 'boardId' })
  @ApiParam({ name: 'columnId' })
  @ApiEnvelope(ColumnDto)
  update(
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateColumnDto,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Column not found');
    }
    return this.columns.update(boardId, columnId, orgId, dto);
  }

  @Delete('boards/:boardId/columns/:columnId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Delete a column' })
  @ApiParam({ name: 'boardId' })
  @ApiParam({ name: 'columnId' })
  @ApiEnvelope(null, { dataNull: true, description: 'Column removed' })
  delete(
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Column not found');
    }
    return this.columns.delete(boardId, columnId, orgId);
  }
}
