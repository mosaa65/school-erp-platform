import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'teacher.updated@school.local' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ApiPropertyOptional({ example: 'teacher_ahmad' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(64)
  username?: string;

  @ApiPropertyOptional({ example: '+967' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(8)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ example: '777123456' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(32)
  phoneNationalNumber?: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsOptional()
  @Transform(({ value }: { value?: string | null }) =>
    value === null ? null : value?.trim() || undefined,
  )
  @IsString()
  @MaxLength(191)
  employeeId?: string | null;

  @ApiPropertyOptional({ example: 'cmguardian1234567890' })
  @IsOptional()
  @Transform(({ value }: { value?: string | null }) =>
    value === null ? null : value?.trim() || undefined,
  )
  @IsString()
  @MaxLength(191)
  guardianId?: string | null;

  @ApiPropertyOptional({ example: 'Ahmad' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Alharbi' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['clxrole01...', 'clxrole02...'],
    description: 'Replaces active role assignments',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];
}
