import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLookupCatalogItemDto } from './dto/create-lookup-catalog-item.dto';
import { ListLookupCatalogItemsDto } from './dto/list-lookup-catalog-items.dto';
import { UpdateLookupCatalogItemDto } from './dto/update-lookup-catalog-item.dto';

const LOOKUP_CATALOG_CONFIG = {
  'blood-types': {
    prismaDelegate: 'lookupBloodType',
    permissionResource: 'lookup-blood-types',
    requiredOnCreate: ['name'],
    searchableFields: ['name'],
    allowedFields: ['name', 'isActive'],
    orderBy: [{ name: 'asc' }],
  },
  'id-types': {
    prismaDelegate: 'lookupIdType',
    permissionResource: 'lookup-id-types',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'ownership-types': {
    prismaDelegate: 'lookupOwnershipType',
    permissionResource: 'lookup-ownership-types',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  periods: {
    prismaDelegate: 'lookupPeriod',
    permissionResource: 'lookup-periods',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'school-types': {
    prismaDelegate: 'lookupSchoolType',
    permissionResource: 'lookup-school-types',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr', 'nameEn'],
    allowedFields: ['code', 'nameAr', 'nameEn', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  genders: {
    prismaDelegate: 'lookupGender',
    permissionResource: 'lookup-genders',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr', 'nameEn'],
    allowedFields: ['code', 'nameAr', 'nameEn', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  qualifications: {
    prismaDelegate: 'lookupQualification',
    permissionResource: 'lookup-qualifications',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'sortOrder', 'isActive'],
    orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
  },
  'job-roles': {
    prismaDelegate: 'lookupJobRole',
    permissionResource: 'lookup-job-roles',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr', 'nameArFemale'],
    allowedFields: ['code', 'nameAr', 'nameArFemale', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  days: {
    prismaDelegate: 'lookupDay',
    permissionResource: 'lookup-days',
    requiredOnCreate: ['code', 'nameAr', 'orderNum'],
    searchableFields: ['code', 'nameAr', 'nameEn'],
    allowedFields: [
      'code',
      'nameAr',
      'nameEn',
      'orderNum',
      'isWorkingDay',
      'isActive',
    ],
    orderBy: [{ orderNum: 'asc' }],
  },
  'attendance-statuses': {
    prismaDelegate: 'lookupAttendanceStatus',
    permissionResource: 'lookup-attendance-statuses',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr', 'colorCode'],
    allowedFields: ['code', 'nameAr', 'appliesTo', 'colorCode', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'marital-statuses': {
    prismaDelegate: 'lookupMaritalStatus',
    permissionResource: 'lookup-marital-statuses',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'health-statuses': {
    prismaDelegate: 'lookupHealthStatus',
    permissionResource: 'lookup-health-statuses',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'requiresDetails', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'enrollment-statuses': {
    prismaDelegate: 'lookupEnrollmentStatus',
    permissionResource: 'lookup-enrollment-statuses',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'orphan-statuses': {
    prismaDelegate: 'lookupOrphanStatus',
    permissionResource: 'lookup-orphan-statuses',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'ability-levels': {
    prismaDelegate: 'lookupAbilityLevel',
    permissionResource: 'lookup-ability-levels',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'activity-types': {
    prismaDelegate: 'lookupActivityType',
    permissionResource: 'lookup-activity-types',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'relationship-types': {
    prismaDelegate: 'lookupRelationshipType',
    permissionResource: 'lookup-relationship-types',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'gender', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  talents: {
    prismaDelegate: 'lookupTalent',
    permissionResource: 'lookup-talents',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr', 'category'],
    allowedFields: ['code', 'nameAr', 'category', 'appliesTo', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'hijri-months': {
    prismaDelegate: 'lookupHijriMonth',
    permissionResource: 'lookup-hijri-months',
    requiredOnCreate: ['code', 'nameAr', 'orderNum'],
    searchableFields: ['code', 'nameAr', 'nameEn'],
    allowedFields: ['code', 'nameAr', 'nameEn', 'orderNum', 'isActive'],
    orderBy: [{ orderNum: 'asc' }],
  },
  weeks: {
    prismaDelegate: 'lookupWeek',
    permissionResource: 'lookup-weeks',
    requiredOnCreate: ['code', 'nameAr', 'orderNum'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'orderNum', 'isActive'],
    orderBy: [{ orderNum: 'asc' }],
  },
  buildings: {
    prismaDelegate: 'lookupBuilding',
    permissionResource: 'lookup-buildings',
    requiredOnCreate: ['code', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  governorates: {
    prismaDelegate: 'governorate',
    permissionResource: 'governorates',
    requiredOnCreate: ['nameAr'],
    searchableFields: ['code', 'nameAr', 'nameEn'],
    allowedFields: ['code', 'nameAr', 'nameEn', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  directorates: {
    prismaDelegate: 'directorate',
    permissionResource: 'directorates',
    requiredOnCreate: ['governorateId', 'nameAr'],
    searchableFields: ['code', 'nameAr'],
    allowedFields: ['governorateId', 'code', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  'sub-districts': {
    prismaDelegate: 'subDistrict',
    permissionResource: 'sub-districts',
    requiredOnCreate: ['directorateId', 'nameAr'],
    searchableFields: ['nameAr'],
    allowedFields: ['directorateId', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  villages: {
    prismaDelegate: 'village',
    permissionResource: 'villages',
    requiredOnCreate: ['subDistrictId', 'nameAr'],
    searchableFields: ['nameAr'],
    allowedFields: ['subDistrictId', 'nameAr', 'isActive'],
    orderBy: [{ nameAr: 'asc' }],
  },
  localities: {
    prismaDelegate: 'locality',
    permissionResource: 'localities',
    requiredOnCreate: ['nameAr', 'localityType'],
    searchableFields: ['nameAr'],
    allowedFields: [
      'villageId',
      'directorateId',
      'nameAr',
      'localityType',
      'isActive',
    ],
    orderBy: [{ nameAr: 'asc' }],
  },
} as const;

type LookupCatalogType = keyof typeof LOOKUP_CATALOG_CONFIG;
type PermissionAction = 'create' | 'read' | 'update' | 'delete';
type CrudDelegate = {
  create(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

const includeUsers = {
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
};

@Injectable()
export class LookupCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    rawType: string,
    payload: CreateLookupCatalogItemDto,
    user: AuthUser,
  ) {
    const type = this.resolveType(rawType);
    this.assertPermission(user, type, 'create');

    const config = this.getConfig(type);
    const delegate = this.getDelegate(type);
    const data = this.buildData(type, payload, true, user.userId);

    try {
      const item = await delegate.create({
        data,
        include: includeUsers,
      });

      await this.auditLogsService.record({
        actorUserId: user.userId,
        action: 'LOOKUP_CATALOG_CREATE',
        resource: `lookup/catalog/${type}`,
        resourceId: String((item as { id?: number }).id ?? ''),
        details: {
          type,
          resource: config.permissionResource,
          payload: data as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
      });

      return item;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId: user.userId,
        action: 'LOOKUP_CATALOG_CREATE_FAILED',
        resource: `lookup/catalog/${type}`,
        status: AuditStatus.FAILURE,
        details: {
          type,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(
    rawType: string,
    query: ListLookupCatalogItemsDto,
    user: AuthUser,
  ) {
    const type = this.resolveType(rawType);
    this.assertPermission(user, type, 'read');

    const config = this.getConfig(type);
    const delegate = this.getDelegate(type);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.InputJsonObject = {
      deletedAt: deletedOnly ? { not: null } : null,
      isActive: deletedOnly ? undefined : query.isActive,
      OR: query.search
        ? config.searchableFields.map((field) => ({
            [field]: {
              contains: query.search,
            },
          }))
        : undefined,
    };

    const total = await delegate.count({ where });
    const items = await delegate.findMany({
      where,
      include: includeUsers,
      orderBy: config.orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(rawType: string, id: number, user: AuthUser) {
    const type = this.resolveType(rawType);
    this.assertPermission(user, type, 'read');

    const delegate = this.getDelegate(type);

    const item = await delegate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: includeUsers,
    });

    if (!item) {
      throw new NotFoundException(`Lookup item not found for ${type}`);
    }

    return item;
  }

  async update(
    rawType: string,
    id: number,
    payload: UpdateLookupCatalogItemDto,
    user: AuthUser,
  ) {
    const type = this.resolveType(rawType);
    this.assertPermission(user, type, 'update');

    const delegate = this.getDelegate(type);
    await this.ensureExists(delegate, type, id);

    const data = this.buildData(type, payload, false, user.userId);

    try {
      const updated = await delegate.update({
        where: { id },
        data,
        include: includeUsers,
      });

      await this.auditLogsService.record({
        actorUserId: user.userId,
        action: 'LOOKUP_CATALOG_UPDATE',
        resource: `lookup/catalog/${type}`,
        resourceId: String(id),
        details: data as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(rawType: string, id: number, user: AuthUser) {
    const type = this.resolveType(rawType);
    this.assertPermission(user, type, 'delete');

    const delegate = this.getDelegate(type);
    await this.ensureExists(delegate, type, id);

    await delegate.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: user.userId,
      },
    });

    await this.auditLogsService.record({
      actorUserId: user.userId,
      action: 'LOOKUP_CATALOG_DELETE',
      resource: `lookup/catalog/${type}`,
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private resolveType(rawType: string): LookupCatalogType {
    if (rawType in LOOKUP_CATALOG_CONFIG) {
      return rawType as LookupCatalogType;
    }

    throw new BadRequestException(`Unsupported lookup type: ${rawType}`);
  }

  private getConfig(type: LookupCatalogType) {
    return LOOKUP_CATALOG_CONFIG[type];
  }

  private getDelegate(type: LookupCatalogType): CrudDelegate {
    const config = this.getConfig(type);
    return (this.prisma as unknown as Record<string, CrudDelegate>)[
      config.prismaDelegate
    ];
  }

  private assertPermission(
    user: AuthUser,
    type: LookupCatalogType,
    action: PermissionAction,
  ) {
    const config = this.getConfig(type);
    const granted = new Set(user.permissionCodes);
    const specificPermission = `${config.permissionResource}.${action}`;
    const genericPermission = `lookup-catalog.${action}`;

    if (
      granted.has(specificPermission) ||
      granted.has(genericPermission) ||
      granted.has('lookup-catalog.manage')
    ) {
      return;
    }

    throw new ForbiddenException({
      message: 'Insufficient permissions',
      missingPermissions: [specificPermission],
    });
  }

  private buildData(
    type: LookupCatalogType,
    payload: CreateLookupCatalogItemDto | UpdateLookupCatalogItemDto,
    isCreate: boolean,
    actorUserId: string,
  ): Record<string, unknown> {
    const config = this.getConfig(type);

    if (isCreate) {
      for (const fieldName of config.requiredOnCreate) {
        const fieldValue = payload[fieldName as keyof typeof payload];
        if (
          fieldValue === undefined ||
          fieldValue === null ||
          fieldValue === ''
        ) {
          throw new BadRequestException(`${fieldName} is required`);
        }
      }
    }

    if (type === 'localities') {
      const hasVillageId = payload.villageId !== undefined;
      const hasDirectorateId = payload.directorateId !== undefined;
      if (isCreate && !hasVillageId && !hasDirectorateId) {
        throw new BadRequestException(
          'Either villageId or directorateId is required',
        );
      }
    }

    const data: Record<string, unknown> = {
      updatedById: actorUserId,
    };

    if (isCreate) {
      data.createdById = actorUserId;
      data.isActive = payload.isActive ?? true;
    }

    for (const fieldName of config.allowedFields) {
      const fieldValue = payload[fieldName];
      if (fieldValue === undefined) {
        continue;
      }

      data[fieldName] = this.normalizeField(fieldName, fieldValue as unknown);
    }

    return data;
  }

  private normalizeField(fieldName: string, value: unknown): unknown {
    if (fieldName === 'code' && typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      if (!normalized) {
        throw new BadRequestException('code cannot be empty');
      }

      return normalized;
    }

    if (
      [
        'name',
        'nameAr',
        'nameEn',
        'nameArFemale',
        'category',
        'colorCode',
      ].includes(fieldName) &&
      typeof value === 'string'
    ) {
      const normalized = value.trim();
      if (['name', 'nameAr'].includes(fieldName) && normalized.length === 0) {
        throw new BadRequestException(`${fieldName} cannot be empty`);
      }

      if (fieldName === 'colorCode') {
        return normalized.toUpperCase();
      }

      return normalized;
    }

    return value;
  }

  private async ensureExists(
    delegate: CrudDelegate,
    type: LookupCatalogType,
    id: number,
  ) {
    const item = await delegate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Lookup item not found for ${type}`);
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Lookup code already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
