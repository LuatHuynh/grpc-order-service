import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { ORDER_PACKAGE_NAME } from 'clt-jwat-common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: ORDER_PACKAGE_NAME,
      protoPath: 'node_modules/clt-jwat-common/common/protos/order.proto',
      url: 'localhost:4001',
    },
  });

  await app.listen();
}
bootstrap();
