import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLogger } from './common/logger/structured-logger.service';

// Ensure BigInt values serialize safely in JSON responses.
(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function () {
  return this.toString();
};

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

  const logger = new StructuredLogger();
  app.useLogger(logger);

  app.use(
    json({
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

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
  app.enableCors({ origin: true, methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", credentials: true });

  const configService = app.get(ConfigService);
  const swaggerPath = (
    configService.get<string>('SWAGGER_PATH') ?? 'api/docs'
  ).replace(/^\/+/, '');
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
    },
  });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`API is running on http://localhost:${port}`);
  logger.log(
    `Swagger docs available at http://localhost:${port}/${swaggerPath}`,
  );
}

void bootstrap();
