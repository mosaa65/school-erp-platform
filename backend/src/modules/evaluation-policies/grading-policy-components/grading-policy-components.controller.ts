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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateGradingPolicyComponentDto } from './dto/create-grading-policy-component.dto';
import { ListGradingPolicyComponentsDto } from './dto/list-grading-policy-components.dto';
import { UpdateGradingPolicyComponentDto } from './dto/update-grading-policy-component.dto';
import { GradingPolicyComponentsService } from './grading-policy-components.service';

@ApiTags('Grading Policy Components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grading-policy-components')
export class GradingPolicyComponentsController {
  constructor(
    private readonly gradingPolicyComponentsService: GradingPolicyComponentsService,
  ) {}

  @Post()
  @RequirePermissions('grading-policy-components.create')
  @ApiOperation({ summary: 'Create grading policy component' })
  create(
    @Body() payload: CreateGradingPolicyComponentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradingPolicyComponentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('grading-policy-components.read')
  @ApiOperation({ summary: 'Get grading policy components' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'gradingPolicyId', required: false, type: String })
  @ApiQuery({ name: 'calculationMode', required: false, type: String })
  @ApiQuery({ name: 'includeInMonthly', required: false, type: Boolean })
  @ApiQuery({ name: 'includeInSemester', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() query: ListGradingPolicyComponentsDto) {
    return this.gradingPolicyComponentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('grading-policy-components.read')
  @ApiOperation({ summary: 'Get grading policy component by ID' })
  findOne(@Param('id') id: string) {
    return this.gradingPolicyComponentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('grading-policy-components.update')
  @ApiOperation({ summary: 'Update grading policy component' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateGradingPolicyComponentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradingPolicyComponentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('grading-policy-components.delete')
  @ApiOperation({ summary: 'Soft delete grading policy component' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.gradingPolicyComponentsService.remove(id, user.userId);
  }
}
