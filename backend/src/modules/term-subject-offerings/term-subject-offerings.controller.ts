import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateTermSubjectOfferingDto } from './dto/create-term-subject-offering.dto';
import { ListTermSubjectOfferingsDto } from './dto/list-term-subject-offerings.dto';
import { UpdateTermSubjectOfferingDto } from './dto/update-term-subject-offering.dto';
import { TermSubjectOfferingsService } from './term-subject-offerings.service';

@ApiTags('Term Subject Offerings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('term-subject-offerings')
export class TermSubjectOfferingsController {
  constructor(
    private readonly termSubjectOfferingsService: TermSubjectOfferingsService,
  ) {}

  @Post()
  @RequirePermissions('term-subject-offerings.create')
  @ApiOperation({ summary: 'Create term subject offering' })
  create(
    @Body() payload: CreateTermSubjectOfferingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.termSubjectOfferingsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('term-subject-offerings.read')
  @ApiOperation({ summary: 'Get paginated term subject offerings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelSubjectId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListTermSubjectOfferingsDto) {
    return this.termSubjectOfferingsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('term-subject-offerings.read')
  @ApiOperation({ summary: 'Get term subject offering by ID' })
  findOne(@Param('id') id: string) {
    return this.termSubjectOfferingsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('term-subject-offerings.update')
  @ApiOperation({ summary: 'Update term subject offering' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateTermSubjectOfferingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.termSubjectOfferingsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('term-subject-offerings.delete')
  @ApiOperation({ summary: 'Soft delete term subject offering' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.termSubjectOfferingsService.remove(id, user.userId);
  }
}
