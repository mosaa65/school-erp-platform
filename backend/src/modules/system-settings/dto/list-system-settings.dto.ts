import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SystemSettingType } from '@prisma/client';

export class ListSystemSettingsDto {
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

  @ApiPropertyOptional({ example: 'date' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: SystemSettingType })
  @IsOptional()
  @IsEnum(SystemSettingType)
  settingType?: SystemSettingType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEditable?: boolean;
}
