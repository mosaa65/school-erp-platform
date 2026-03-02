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
import { StudentGender, StudentOrphanStatus } from '@prisma/client';

export class ListStudentsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'mohammed' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: StudentGender })
  @IsOptional()
  @IsEnum(StudentGender)
  gender?: StudentGender;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bloodTypeId?: number;

  @ApiPropertyOptional({ enum: StudentOrphanStatus })
  @IsOptional()
  @IsEnum(StudentOrphanStatus)
  orphanStatus?: StudentOrphanStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
