import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemSettingType } from '@prisma/client';

export class CreateSystemSettingDto {
  @ApiProperty({ example: 'default_date_format' })
  @IsString()
  @Matches(/^[a-z0-9_.:-]+$/)
  @MaxLength(100)
  settingKey!: string;

  @ApiPropertyOptional({ example: 'hijri' })
  @IsOptional()
  @IsString()
  settingValue?: string;

  @ApiPropertyOptional({
    enum: SystemSettingType,
    example: SystemSettingType.TEXT,
  })
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
