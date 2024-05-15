import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { config } from '@config';
import { OrderEntity } from '@entities/oder.entity';
import { OrderService } from './order.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from '@entities/oderItem.entity';
import { OrderController } from './order.controller';
import { PRODUCT_PACKAGE_NAME } from 'clt-jwat-common';

@Module({
  providers: [OrderService],
  imports: [
    ClientsModule.register([
      {
        name: PRODUCT_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: PRODUCT_PACKAGE_NAME,
          protoPath: 'node_modules/clt-jwat-common/common/protos/product.proto',
          url: config.PRODUCT_SERVICE_URL,
        },
      },
    ]),
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]),
  ],
  controllers: [OrderController],
})
export class OrderModule {}
