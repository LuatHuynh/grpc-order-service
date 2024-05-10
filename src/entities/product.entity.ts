import { BaseEntity } from './base.entity';

export class ProductEntity extends BaseEntity {
  id: string;

  name: string;

  category?: string | undefined;

  make: string;

  description?: string;

  price: number;

  quantity: number;
}
