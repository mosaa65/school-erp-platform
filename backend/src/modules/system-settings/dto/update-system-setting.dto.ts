import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SystemSettingType } from '@prisma/client';

export class UpdateSystemSettingDto {
  @ApiPropertyOptional({ example: 'hijri' })
  @IsOptional()
  @IsString()
  settingValue?: string;

  @ApiPropertyOptional({ enum: SystemSettingType })
  @IsOptional()
  @IsEnum(SystemSettingType)
  settingType?: SystemSettingType;

  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 'صيغة التاريخ الافتراضية' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEditable?: boolean;
}
