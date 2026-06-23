import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: true, // In production, replace with specific domains
    credentials: true,
  });

  // Enable global validation pipe with strict policies
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true, // Automatically converts query params
      },
    }),
  );

  // Enable global exception filter to standardize all error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Configure Swagger OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('TeamSync API')
    .setDescription('The core REST API for TeamSync project and task tracking platform.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth', // This credential name is referenced by `@ApiBearerAuth('JWT-auth')`
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 TeamSync API is running on: http://localhost:${port}`);
  console.log(`📑 API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
