import { Field } from '@nestjs/graphql';
import { Column, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @Column({ name: 'created_at', default: new Date() })
  @Field((type) => Date)
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Field((type) => Date)
  deletedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Field((type) => Date)
  updatedAt: Date;
}
