import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { config } from '@config';
import { OrderModule } from '@modules/order/order.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: config.DATABASE_URL,
      entities: ['dist/**/*.entity{.ts,.js}'],
      ssl: true,
    }),
    OrderModule,
  ],
})
export class AppModule {}
