import { join } from 'path';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { ORDER_PACKAGE_NAME } from '@common/type';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: ORDER_PACKAGE_NAME,
      protoPath: join(__dirname, '../proto/order.proto'),
      url: 'localhost:4001',
    },
  });

  await app.listen();
}
bootstrap();
