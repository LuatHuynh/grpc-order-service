import { ClientGrpc } from '@nestjs/microservices';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { lastValueFrom } from 'rxjs';
import { DataSource, Repository } from 'typeorm';

import { ORDER_STATUS_ENUM, OrderEntity } from '@entities/oder.entity';
import { ORDER_ERROR_ENUM } from '@const/order';
import { InjectRepository } from '@nestjs/typeorm';
import { PRODUCT_ERROR_ENUM } from '@const/product';
import { OrderItemEntity } from '@entities/oderItem.entity';
import { ServiceRpcException } from '@exceptions';

@Injectable()
export class OrderService implements OnModuleInit {
  private productService: ProductServiceClient;

  constructor(
    @Inject(PRODUCT_PACKAGE_NAME) private client: ClientGrpc,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.productService =
      this.client.getService<ProductServiceClient>(PRODUCT_SERVICE_NAME);
  }

  async getOrderById(dto: OrderIdDto) {
    const { id } = dto;

    const order = await this.orderRepository.findOne({
      where: {
        id: id,
      },
      relations: {
        orderItems: true,
      },
    });
    if (!order)
      throw new ServiceRpcException({
        code: HttpStatus.NOT_FOUND,
        message: ORDER_ERROR_ENUM.ORDER_NOT_FOUND,
      });

    order.orderItems.every(async (i) => {
      try {
        const resProduct = await lastValueFrom(
          this.productService.findProductById({ id: i.productId }),
        );
        i.product = resProduct;
      } catch (error) {
        i.product = null;
      }
    });
    return order;
  }

  async getOrderByFilter(filter: OrderFilterDto) {
    const query = this.orderRepository.createQueryBuilder('order');
    query.leftJoinAndSelect('order.orderItems', 'orderItem');

    if (filter.phoneNumber) {
      query.andWhere('order.phoneNumber = :phoneNumber', {
        phoneNumber: filter.phoneNumber,
      });
    }

    if (filter.email) {
      query.andWhere('order.email = :email', { email: filter.email });
    }

    if (filter.customerName) {
      query.andWhere('order.customerName = :customerName', {
        customerName: filter.customerName,
      });
    }

    if (filter.address) {
      query.andWhere('order.address = :address', { address: filter.address });
    }

    if (filter.status) {
      query.andWhere('order.status = :status', { status: filter.status });
    }

    if (filter.minTotal && filter.maxTotal) {
      query.andWhere(
        'SUM(orderItem.quantity * orderItem.price) between :minTotal and :maxTotal',
        {
          minTotal: filter.minTotal,
          maxTotal: filter.maxTotal,
        },
      );
    } else if (filter.minTotal) {
      query.andWhere('SUM(orderItem.quantity * orderItem.price) >= :minTotal', {
        minTotal: filter.minTotal,
      });
    } else if (filter.maxTotal) {
      query.andWhere('SUM(orderItem.quantity * orderItem.price) <= :maxTotal', {
        maxTotal: filter.maxTotal,
      });
    }

    if (filter.fromDate && filter.toDate) {
      query.andWhere('order.createdAt between :fromDate and :toDate', {
        fromDate: filter.fromDate,
        toDate: filter.toDate,
      });
    } else if (filter.fromDate) {
      query.andWhere('order.createdAt >= :fromDate', {
        fromDate: filter.fromDate,
      });
    } else if (filter.toDate) {
      query.andWhere('order.createdAt <= :toDate', {
        toDate: filter.toDate,
      });
    }

    query.groupBy('order.id');

    const orders = await query.getMany();
    orders.every((o) => {
      o.orderItems.every(async (i) => {
        try {
          const resProduct = await lastValueFrom(
            this.productService.findProductById({ id: i.productId }),
          );
          i.product = resProduct;
        } catch (error) {
          i.product = null;
        }
      });
    });

    return orders;
  }

  async createOrder(createOrderDto: CreateOrderDto) {
    try {
      await this.dataSource.manager.transaction(async (manager) => {
        // execute queries using transactionalEntityManager
        const productRepository = manager.getRepository(OrderEntity);
        const productItemRepository = manager.getRepository(OrderItemEntity);

        const { orderProducts, ...orderInfo } = createOrderDto;

        //check duplicated ID
        orderProducts.every((o) => {
          if (orderProducts.some((x) => x.productId === o.productId))
            throw new ServiceRpcException({
              code: HttpStatus.CONFLICT,
              message: `${PRODUCT_ERROR_ENUM.DUPLICATED_PRODUCT_ID}: ${o.productId}`,
            });
        });

        //create order
        const order = productRepository.create(orderInfo);
        const newOrder = await productRepository.save(order);

        //get products
        const products: Product[] = await Promise.all(
          orderProducts.map(async (p) => {
            return await lastValueFrom(
              this.productService.findProductById({ id: p.productId }),
            );
          }),
        );

        //create order items
        const orderItems: OrderItemEntity[] = products.map((p) =>
          productItemRepository.create({
            orderId: newOrder.id,
            productId: p.id,
            quantity: orderProducts.find((o) => o.productId === p.id).quantity,
            price: p.price,
            product: p,
          }),
        );
        const newOrderItems: OrderItemEntity[] =
          await productItemRepository.save(orderItems);

        //update quantity of products
        //TO DO: mock

        newOrder.orderItems = newOrderItems;
        return newOrder;
      });
    } catch (error: any) {
      throw error;
    }
  }

  async updateOrderStatus(updateDto: UpdateOrderStatusDto) {
    const { status, orderId } = updateDto;

    const order = await this.getOrderById({ id: orderId });

    if (!order)
      throw new ServiceRpcException({
        code: HttpStatus.NOT_FOUND,
        message: ORDER_ERROR_ENUM.ORDER_NOT_FOUND,
      });

    //if new status is current status
    if (order.status === status)
      throw new ServiceRpcException({
        code: HttpStatus.CONFLICT,
        message: ORDER_ERROR_ENUM.DUPLICATE_STATUS,
      });

    if (!(status in ORDER_STATUS_ENUM))
      throw new ServiceRpcException({
        code: HttpStatus.BAD_REQUEST,
        message: ORDER_ERROR_ENUM.STATUS_NOT_FOUND,
      });

    await this.orderRepository.update(
      {
        id: orderId,
      },
      {
        status: status,
      },
    );

    order.status = ORDER_STATUS_ENUM.CANCELED;
    return order;
  }

  async deleteOrder(dto: OrderIdDto) {
    const order = await this.getOrderById(dto);

    await this.orderRepository.delete({ id: order.id });

    return order;
  }
}
