import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from './base.entity';
import { OrderItemEntity } from './oderItem.entity';

export enum ORDER_STATUS_ENUM {
  CONFIRMED = 'Confirmed',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELED = 'Canceled',
}

@Entity({
  name: 'order',
})
@ObjectType()
export class OrderEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'order_id' })
  @Field()
  id: string;

  @Column({ name: 'phone_number' })
  @Field()
  phoneNumber: string;

  @Column()
  @Field()
  email: string;

  @Column({ name: 'customer_name' })
  @Field()
  customerName: string;

  @Column()
  @Field()
  address: string;

  @Column({
    type: 'enum',
    enum: ORDER_STATUS_ENUM,
    default: ORDER_STATUS_ENUM.CONFIRMED,
  })
  @Field()
  status: string;

  @OneToMany(() => OrderItemEntity, (orderItem) => orderItem.order)
  @Field((returns) => [OrderItemEntity])
  orderItems: OrderItemEntity[];
}
