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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AttachmentDto,
  CardCreatedResponseDto,
  CardDetailResponseDto,
  CardListItemDto,
} from '../api-responses';
import { ORG_MEMBERS, Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApiEnvelope,
  ApiEnvelopeCreated,
} from '../common/swagger/api-envelope.swagger';

@ApiTags('Cards')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(
    private readonly cards: CardsService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('columns/:columnId/cards')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Create a card in a column' })
  @ApiParam({ name: 'columnId' })
  @ApiEnvelopeCreated(CardCreatedResponseDto)
  create(
    @Param('columnId') columnId: string,
    @CurrentUser() user: Express.User,
    @Body() dto: CreateCardDto,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    return this.cards.create(columnId, orgId, user.id, user.email, dto);
  }

  @Get('columns/:columnId/cards')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List cards in a column' })
  @ApiParam({ name: 'columnId' })
  @ApiEnvelope(CardListItemDto, { isArray: true })
  list(@Param('columnId') columnId: string, @Req() req: Request) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    return this.cards.listForColumn(columnId, orgId);
  }

  @Get('cards/:cardId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Get a single card' })
  @ApiParam({ name: 'cardId' })
  @ApiEnvelope(CardDetailResponseDto)
  get(@Param('cardId') cardId: string, @Req() req: Request) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    return this.cards.getOne(cardId, orgId);
  }

  @Patch('cards/:cardId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Update a card' })
  @ApiParam({ name: 'cardId' })
  @ApiEnvelope(CardDetailResponseDto)
  update(
    @Param('cardId') cardId: string,
    @CurrentUser() user: Express.User,
    @Body() dto: UpdateCardDto,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    return this.cards.update(cardId, orgId, user.id, user.email, dto);
  }

  @Patch('cards/:cardId/move')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Move a card to another column/position' })
  @ApiParam({ name: 'cardId' })
  @ApiEnvelope(CardDetailResponseDto)
  move(
    @Param('cardId') cardId: string,
    @CurrentUser() user: Express.User,
    @Body() dto: MoveCardDto,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    return this.cards.move(cardId, orgId, user.id, user.email, dto);
  }

  @Delete('cards/:cardId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Delete a card' })
  @ApiParam({ name: 'cardId' })
  @ApiEnvelope(null, { dataNull: true, description: 'Card removed' })
  delete(@Param('cardId') cardId: string, @Req() req: Request) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    return this.cards.delete(cardId, orgId);
  }

  @Get('cards/:cardId/attachments')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'List attachments for a card' })
  @ApiParam({ name: 'cardId' })
  @ApiEnvelope(AttachmentDto, { isArray: true })
  async listAttachments(@Param('cardId') cardId: string, @Req() req: Request) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    await this.cards.getOne(cardId, orgId);
    return this.prisma.attachment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('cards/:cardId/attachments')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an attachment (max 20MB)' })
  @ApiParam({ name: 'cardId' })
  @ApiEnvelopeCreated(AttachmentDto)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async uploadAttachment(
    @Param('cardId') cardId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file?.buffer) {
      throw new NotFoundException('File is required');
    }
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    await this.cards.getOne(cardId, orgId);
    const fileName = file.originalname?.trim() || 'unnamed';
    const url = await this.storage.uploadObject(
      file.buffer,
      file.mimetype,
      orgId,
      'card-attachments',
      fileName,
    );
    return this.prisma.attachment.create({
      data: { cardId, url, fileName },
    });
  }

  @Delete('cards/:cardId/attachments/:attachmentId')
  @UseGuards(RolesGuard)
  @Roles(...ORG_MEMBERS)
  @ApiOperation({ summary: 'Delete an attachment from a card' })
  @ApiParam({ name: 'cardId' })
  @ApiParam({ name: 'attachmentId' })
  @ApiEnvelope(null, { dataNull: true, description: 'Attachment removed' })
  async deleteAttachment(
    @Param('cardId') cardId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: Request,
  ) {
    const orgId = req.membership?.orgId;
    if (!orgId) {
      throw new NotFoundException('Not found');
    }
    await this.cards.getOne(cardId, orgId);
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, cardId },
    });
    if (!att) {
      throw new NotFoundException('Attachment not found');
    }
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    await this.storage.deleteObjectByPublicUrl(att.url);
  }
}
