import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'teacher@school.local' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ApiPropertyOptional({ example: 'teacher_ahmad' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @MaxLength(64)
  username?: string;

  @ApiProperty({ example: '+967' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  phoneCountryCode!: string;

  @ApiProperty({ example: '777123456' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phoneNationalNumber!: string;

  @ApiPropertyOptional({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(191)
  employeeId?: string;

  @ApiPropertyOptional({ example: 'cmguardian1234567890' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(191)
  guardianId?: string;

  @ApiProperty({ example: 'Ahmad' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: 'Alharbi' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(120)
  lastName!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['clxrole01...', 'clxrole02...'],
    description: 'Role IDs assigned to user',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];
}
