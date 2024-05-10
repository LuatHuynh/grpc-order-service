import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { config } from '@config';
import { OrderEntity } from '@entities/oder.entity';
import { OrderService } from './order.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from '@entities/oderItem.entity';
import { PRODUCT_PACKAGE_NAME } from 'src/common/type/product';

@Module({
  providers: [OrderService],
  imports: [
    ClientsModule.register([
      {
        name: PRODUCT_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: PRODUCT_PACKAGE_NAME,
          protoPath: join(__dirname, '../../../proto/product.proto'),
          url: config.PRODUCT_SERVICE_URL,
        },
      },
    ]),
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]),
  ],
})
export class OrderModule {}
