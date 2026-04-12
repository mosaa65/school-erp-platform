import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditStatus } from '@prisma/client';

export class ListAuditLogsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'users' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ example: 'USER_UPDATE' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: 'UPDATE',
    description: 'Normalized action type (supports suffix match, e.g. USER_UPDATE)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  actionType?: string;

  @ApiPropertyOptional({
    example: 'students',
    description:
      'Domain filter (attendance, grades, fees, students, teachers, permissions, notifications, system)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  domain?: string;

  @ApiPropertyOptional({ enum: AuditStatus, example: AuditStatus.SUCCESS })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional({ example: 'clxuser01...' })
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiPropertyOptional({
    example: 'admin@example.com',
    description: 'Searchable actor input (id, email, first name, last name)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  user?: string;

  @ApiPropertyOptional({
    example: 'finance',
    description:
      'Text search over action, resource, actor fields, resourceId, ip, and userAgent',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({ example: '2026-02-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-02-21T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
