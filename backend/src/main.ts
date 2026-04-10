import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLogger } from './common/logger/structured-logger.service';

// Ensure BigInt values serialize safely in JSON responses.
(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function () {
  return this.toString();
};

const AUTO_CODE_PATH_RULES: Array<{
  prefixes: string[];
  field: 'code';
}> = [
  {
    prefixes: [
      '/academic-years',
      '/academic-terms',
      '/academic-months',
      '/grade-levels',
      '/subjects',
      '/sections',
      '/classrooms',
      '/school-profiles',
      '/talents',
      '/employee-departments',
      '/lookup-id-types',
      '/lookup-ownership-types',
      '/lookup-periods',
      '/lookup-activity-types',
      '/lookup-ability-levels',
      '/lookup-orphan-statuses',
      '/lookup-enrollment-statuses',
      '/promotion-decisions',
      '/annual-statuses',
      '/results-decisions/promotion-decisions',
      '/results-decisions/annual-statuses',
      '/assignments/homework-types',
      '/homework-types',
    ],
    field: 'code',
  },
  {
    prefixes: ['/roles'],
    field: 'code',
  },
];

function randomCodePart(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function buildAutoCode(): string {
  const seed = randomCodePart();
  return `AUTO_${seed}`.slice(0, 40);
}

function buildRoleCode(): string {
  return `role_${randomCodePart().toLowerCase()}`.replace(/[^a-z0-9_.:-]/g, '').slice(0, 120);
}

function resolveAutoCodeField(pathname: string) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  for (const rule of AUTO_CODE_PATH_RULES) {
    if (rule.prefixes.some((prefix) => normalized.startsWith(prefix))) {
      return rule.field;
    }
  }
  return null;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const coerceBoolean = (value: unknown): unknown => {
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }

      return value;
    };

    const coerceQueryBooleans = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(coerceQueryBooleans);
      }
      if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        for (const [key, nested] of entries) {
          (value as Record<string, unknown>)[key] = coerceQueryBooleans(nested);
        }
        return value;
      }

      return coerceBoolean(value);
    };

    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        req.query[key] = coerceQueryBooleans(value) as string | string[];
      }
    }

    next();
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.method !== 'POST' || !req.body || typeof req.body !== 'object') {
      return next();
    }

    const body = req.body as Record<string, unknown>;
    const field = resolveAutoCodeField(req.path);
    if (!field) {
      return next();
    }

    const rawValue = body[field];
    const isMissing =
      rawValue === undefined ||
      rawValue === null ||
      (typeof rawValue === 'string' && rawValue.trim() === '');

    if (!isMissing) {
      return next();
    }

    if (field === 'code' && req.path.startsWith('/roles')) {
      body.code = buildRoleCode();
      return next();
    }

    body[field] = buildAutoCode();
    next();
  });

  const logger = new StructuredLogger();
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const trustProxy = configService.get<string>('AUTH_TRUST_PROXY') === 'true';
  if (trustProxy) {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance() as {
      set?: (key: string, value: unknown) => void;
    };
    instance.set?.('trust proxy', 1);
  }

  const enforceHttps =
    configService.get<string>('AUTH_ENFORCE_HTTPS') === 'true' ||
    process.env.NODE_ENV === 'production';

  if (enforceHttps) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const proto =
        typeof forwardedProto === 'string'
          ? forwardedProto.split(',')[0].trim()
          : req.secure
            ? 'https'
            : 'http';

      if (proto !== 'https') {
        return res.status(400).json({
          message: 'HTTPS is required.',
        });
      }

      return next();
    });
  }

  app.use(
    json({
      verify: (req: Request, _res: Response, buf: Buffer) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const isProduction = process.env.NODE_ENV === 'production';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('School ERP Backend API')
    .setDescription(
      'System 01 (Shared Infrastructure) + System 02 (Academic Core) + System 03 (HR) + System 04 (Students) + System 05 (Teaching & Grades, including governance reports)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const corsOriginRaw = configService.get<string>('CORS_ORIGIN')?.trim() ?? '';

  if (isProduction && (!corsOriginRaw || corsOriginRaw === '*')) {
    logger.warn(
      'CORS_ORIGIN is not set or is wildcard (*) in production. ' +
        'All origins will be allowed. Set CORS_ORIGIN to your frontend URL.',
    );
  }

  const corsOrigin =
    !corsOriginRaw || corsOriginRaw === '*'
      ? true
      : corsOriginRaw
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
  const corsCredentials =
    (configService.get<string>('CORS_CREDENTIALS') ?? 'true')
      .trim()
      .toLowerCase() === 'true';

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: corsCredentials,
  });

  const swaggerPath = (
    configService.get<string>('SWAGGER_PATH') ?? 'api/docs'
  ).replace(/^\/+/, '');

  if (!isProduction) {
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
      },
    });
  }

  const portRaw = configService.get<string>('PORT') ?? '3000';
  const parsedPort = Number.parseInt(portRaw, 10);
  const port = Number.isFinite(parsedPort) ? parsedPort : 3000;

  await app.listen(port, '0.0.0.0');

  logger.log(`API is running on http://localhost:${port}`);
  if (!isProduction) {
    logger.log(
      `Swagger docs available at http://localhost:${port}/${swaggerPath}`,
    );
  }
}

void bootstrap();
