import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuardianRelationship } from '@prisma/client';

export class CreateStudentGuardianDto {
  @ApiProperty({ example: 'cmabc123student' })
  @IsString()
  studentId!: string;

  @ApiProperty({ example: 'cmabc123guardian' })
  @IsString()
  guardianId!: string;

  @ApiProperty({
    enum: GuardianRelationship,
    example: GuardianRelationship.FATHER,
  })
  @IsOptional()
  @IsEnum(GuardianRelationship)
  relationship?: GuardianRelationship;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  relationshipTypeId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canReceiveNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canPickup?: boolean;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-06-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Primary contact for attendance updates' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
