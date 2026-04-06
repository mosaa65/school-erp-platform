import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassroomDto {
  @ApiPropertyOptional({ example: 'room-a1' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsString()
  @Matches(/^[a-z0-9_.:-]+$/)
  @MaxLength(40)
  code?: string;

  @ApiProperty({ example: 'الفصل A1' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  buildingLookupId?: number;

  @ApiPropertyOptional({ example: 'قريب من المختبر' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
