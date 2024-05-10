import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { OrderEntity } from './oder.entity';
import { BaseEntity } from './base.entity';
import { ProductEntity } from './product.entity';

@Entity({
  name: 'order_item',
})
@ObjectType()
export class OrderItemEntity extends BaseEntity {
  @PrimaryColumn('uuid', { name: 'order_id' })
  @Field()
  orderId: string;

  @PrimaryColumn('uuid', { name: 'product_id' })
  @Field()
  productId: string;

  @Column()
  @Field((type) => Int)
  quantity: number;

  @Column({ type: 'float' })
  @Field((type) => Float)
  price: number;

  @ManyToOne(() => OrderEntity, (order) => order.orderItems)
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @Field((type) => ProductEntity)
  product: ProductEntity | undefined;
}
