import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ParentNotificationSendMethod,
  ParentNotificationType,
} from '@prisma/client';

export class CreateParentNotificationDto {
  @ApiProperty({ example: 'cmabc123student' })
  @IsString()
  studentId!: string;

  @ApiProperty({
    enum: ParentNotificationType,
    example: ParentNotificationType.NEGATIVE,
  })
  @IsEnum(ParentNotificationType)
  notificationType!: ParentNotificationType;

  @ApiPropertyOptional({
    example: 1,
    description: 'معرّف صفة ولي الأمر من lookup_relationship_types',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guardianTitleId?: number;

  @ApiPropertyOptional({ example: 'سلوكي' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  behaviorType?: string;

  @ApiPropertyOptional({ example: 'تم ملاحظة سلوك غير منضبط أثناء الحصة.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  behaviorDescription?: string;

  @ApiPropertyOptional({
    example: 'يرجى مراجعة إدارة المدرسة خلال هذا الأسبوع.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requiredAction?: string;

  @ApiPropertyOptional({
    enum: ParentNotificationSendMethod,
    example: ParentNotificationSendMethod.PAPER,
  })
  @IsOptional()
  @IsEnum(ParentNotificationSendMethod)
  sendMethod?: ParentNotificationSendMethod;

  @ApiPropertyOptional({ example: 'عبدالله محمد' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  messengerName?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isSent?: boolean;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  sentDate?: string;

  @ApiPropertyOptional({
    example: 'تم الاتفاق مع ولي الأمر على خطة متابعة أسبوعية.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  results?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

