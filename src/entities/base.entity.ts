import { Field } from '@nestjs/graphql';
import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @CreateDateColumn({ name: 'created_at' })
  @Field((type) => Date)
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Field((type) => Date)
  deletedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Field((type) => Date)
  updatedAt: Date;
}
