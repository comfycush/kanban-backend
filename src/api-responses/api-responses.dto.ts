import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, NotificationType, Role } from '@prisma/client';

// --- User ---

export class UserRefDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
}

export class UserPublicDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty() createdAt: Date;
}

// --- Auth ---

export class RegisterResponseDto {
  @ApiProperty({ type: () => UserPublicDto })
  user: UserPublicDto;

  @ApiProperty() accessToken: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: () => UserPublicDto })
  user: UserPublicDto;

  @ApiProperty() accessToken: string;
}

// --- Organization ---

export class OrganizationDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;
}

export class MembershipWithUserDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() orgId: string;
  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => UserRefDto })
  user: UserRefDto;
}

export class MembershipWithOrgDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() orgId: string;
  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => OrganizationDto })
  org: OrganizationDto;
}

export class OrgWithMembershipsAndUsersDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: [MembershipWithUserDto] })
  memberships: MembershipWithUserDto[];
}

// --- Board / column / card (primitives) ---

export class BoardDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() orgId: string;
  @ApiProperty() createdAt: Date;
}

export class CardInColumnDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null;
  @ApiProperty() columnId: string;
  @ApiProperty() order: number;
  @ApiPropertyOptional({ nullable: true, type: String })
  assignedToId: string | null;
  @ApiProperty() createdAt: Date;
}

export class ColumnWithOrderedCardsDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() boardId: string;
  @ApiProperty() order: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: [CardInColumnDto] })
  cards: CardInColumnDto[];
}

export class BoardWithColumnsAndCardsDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() orgId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: [ColumnWithOrderedCardsDto] })
  columns: ColumnWithOrderedCardsDto[];
}

export class ColumnDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() boardId: string;
  @ApiProperty() order: number;
  @ApiProperty() createdAt: Date;
}

export class ColumnCardCountDto {
  @ApiProperty() cards: number;
}

export class ColumnWithCardCountDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() boardId: string;
  @ApiProperty() order: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => ColumnCardCountDto })
  _count: ColumnCardCountDto;
}

export class AttachmentDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() fileName: string;
  @ApiProperty() cardId: string;
  @ApiProperty() createdAt: Date;
}

export class BoardRefDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() orgId: string;
  @ApiProperty() createdAt: Date;
}

export class ColumnWithBoardDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() boardId: string;
  @ApiProperty() order: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => BoardRefDto })
  board: BoardRefDto;
}

export class CardListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null;
  @ApiProperty() columnId: string;
  @ApiProperty() order: number;
  @ApiPropertyOptional({ nullable: true, type: String })
  assignedToId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({ type: () => UserRefDto, nullable: true })
  assignedTo: UserRefDto | null;
}

export class CardCreatedResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null;
  @ApiProperty() columnId: string;
  @ApiProperty() order: number;
  @ApiPropertyOptional({ nullable: true, type: String })
  assignedToId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => ColumnWithBoardDto })
  column: ColumnWithBoardDto;
}

export class CardDetailResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null;
  @ApiProperty() columnId: string;
  @ApiProperty() order: number;
  @ApiPropertyOptional({ nullable: true, type: String })
  assignedToId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => ColumnWithBoardDto })
  column: ColumnWithBoardDto;
  @ApiPropertyOptional({ type: () => UserRefDto, nullable: true })
  assignedTo: UserRefDto | null;
  @ApiProperty({ type: [AttachmentDto] })
  attachments: AttachmentDto[];
}

// --- Message ---

export class MessageWithUserDto {
  @ApiProperty() id: string;
  @ApiProperty() content: string;
  @ApiProperty() userId: string;
  @ApiProperty() orgId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => UserRefDto })
  user: UserRefDto;
}

// --- Notification ---

export class NotificationItemDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  type: NotificationType;
  @ApiProperty({ type: 'object', additionalProperties: true })
  data: object;
  @ApiProperty({
    description: 'Human-readable notification text derived from type and data',
  })
  message: string;
  @ApiProperty() read: boolean;
  @ApiProperty() createdAt: Date;
}

export class PrismaUpdateManyResultDto {
  @ApiProperty() count: number;
}

// --- Activity log ---

export class ActivityLogCardRefDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
}

export class ActivityLogItemDto {
  @ApiProperty() id: string;
  @ApiProperty() orgId: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  userId: string | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  cardId: string | null;
  @ApiProperty({ enum: ActivityType, enumName: 'ActivityType' })
  type: ActivityType;
  @ApiProperty({ type: 'object', additionalProperties: true })
  data: object;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({ type: () => UserRefDto, nullable: true })
  user: UserRefDto | null;
  @ApiPropertyOptional({ type: () => ActivityLogCardRefDto, nullable: true })
  card: ActivityLogCardRefDto | null;
}
