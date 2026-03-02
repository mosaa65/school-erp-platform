import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const LOOKUP_APPLIES_TO_VALUES = ['STUDENTS', 'EMPLOYEES', 'ALL'] as const;
const LOOKUP_RELATIONSHIP_GENDER_VALUES = ['MALE', 'FEMALE', 'ALL'] as const;
const LOCALITY_TYPE_VALUES = ['RURAL', 'URBAN'] as const;

export class CreateLookupCatalogItemDto {
  @ApiPropertyOptional({ example: 'MORNING' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'code must contain only uppercase letters, numbers, or underscores',
  })
  code?: string;

  @ApiPropertyOptional({ example: 'صباحية' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'Morning' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameEn?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional({ example: 'معلمة' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameArFemale?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  orderNum?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isWorkingDay?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  governorateId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  directorateId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subDistrictId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  villageId?: number;

  @ApiPropertyOptional({ enum: LOOKUP_APPLIES_TO_VALUES, example: 'ALL' })
  @IsOptional()
  @IsIn(LOOKUP_APPLIES_TO_VALUES)
  appliesTo?: (typeof LOOKUP_APPLIES_TO_VALUES)[number];

  @ApiPropertyOptional({ example: '#28A745' })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorCode must be a valid HEX color like #28A745',
  })
  colorCode?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresDetails?: boolean;

  @ApiPropertyOptional({
    enum: LOOKUP_RELATIONSHIP_GENDER_VALUES,
    example: 'ALL',
  })
  @IsOptional()
  @IsIn(LOOKUP_RELATIONSHIP_GENDER_VALUES)
  gender?: (typeof LOOKUP_RELATIONSHIP_GENDER_VALUES)[number];

  @ApiPropertyOptional({ enum: LOCALITY_TYPE_VALUES, example: 'RURAL' })
  @IsOptional()
  @IsIn(LOCALITY_TYPE_VALUES)
  localityType?: (typeof LOCALITY_TYPE_VALUES)[number];

  @ApiPropertyOptional({ example: 'رياضية' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
