import { lastValueFrom } from 'rxjs';
import {
  Brackets,
  DataSource,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { ClientGrpc } from '@nestjs/microservices';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';

import {
  OrderIdDto,
  OrderResponse,
  OrdersResponse,
  CreateOrderDto,
  OrderFilterDto,
  PRODUCT_PACKAGE_NAME,
  PRODUCT_SERVICE_NAME,
  ProductServiceClient,
  UpdateOrderStatusDto,
} from 'clt-jwat-common';
import { InjectRepository } from '@nestjs/typeorm';
import { PRODUCT_ERROR_ENUM } from '@const/product';
import { COMMON_MESSAGE_ENUM } from '@const/common';
import { OrderItemEntity } from '@entities/oderItem.entity';
import { ORDER_ERROR_ENUM } from '@const/order';
import { ORDER_STATUS_ENUM, OrderEntity } from '@entities/oder.entity';

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

  async getProductsInOrder(order: OrderEntity) {
    const itemsWithProduct = await Promise.all(
      order.orderItems.map(async (i) => {
        try {
          const resProduct = await lastValueFrom(
            this.productService.findProductById({ id: i.productId }),
          );
          i.product = resProduct.product;
        } catch (error) {
          i.product = null;
        }
        return i;
      }),
    );
    order.orderItems = itemsWithProduct;
  }

  async getOrderById(dto: OrderIdDto): Promise<OrderResponse> {
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
      return {
        code: HttpStatus.NOT_FOUND,
        message: ORDER_ERROR_ENUM.ORDER_NOT_FOUND,
        order: null,
      };

    await this.getProductsInOrder(order);

    return {
      code: HttpStatus.OK,
      message: COMMON_MESSAGE_ENUM.SUCCESS,
      order: order,
    };
  }

  async getOrderByFilter(filter: OrderFilterDto): Promise<OrdersResponse> {
    const query = this.orderRepository.createQueryBuilder('order');
    query.select('order.order_id');
    query.leftJoin('order.orderItems', 'orderItem');

    if (filter.phoneNumber) {
      query.andWhere('order.phone_number = :phoneNumber', {
        phoneNumber: filter.phoneNumber,
      });
    }

    if (filter.email) {
      query.andWhere('order.email ILIKE :email', {
        email: `%${filter.email}%`,
      });
    }

    if (filter.customerName) {
      query.andWhere('order.customer_name ILIKE :customerName', {
        customerName: `%${filter.customerName}%`,
      });
    }

    if (filter.address) {
      query.andWhere('order.address ILIKE :address', {
        address: `%${filter.address}%`,
      });
    }

    if (filter.status) {
      query.andWhere('order.status = :status', { status: filter.status });
    }

    if (filter.fromDate && filter.toDate) {
      query.andWhere('order.created_at between :fromDate and :toDate', {
        fromDate: filter.fromDate,
        toDate: filter.toDate,
      });
    } else if (filter.fromDate) {
      query.andWhere('order.created_at >= :fromDate', {
        fromDate: filter.fromDate,
      });
    } else if (filter.toDate) {
      query.andWhere('order.created_at <= :toDate', {
        toDate: filter.toDate,
      });
    }

    query.groupBy('order.order_id, orderItem.order_id');

    if (filter.minTotal && filter.maxTotal) {
      query.andHaving(
        'SUM(orderItem.quantity * orderItem.price) between :minTotal and :maxTotal',
        {
          minTotal: filter.minTotal,
          maxTotal: filter.maxTotal,
        },
      );
    } else if (filter.minTotal) {
      query.andHaving(
        'SUM(orderItem.quantity * orderItem.price) >= :minTotal',
        {
          minTotal: filter.minTotal,
        },
      );
    } else if (filter.maxTotal) {
      query.andHaving(
        'SUM(orderItem.quantity * orderItem.price) <= :maxTotal',
        {
          maxTotal: filter.maxTotal,
        },
      );
    }

    if (filter.minTotal && filter.maxTotal) {
      query.andHaving(
        'SUM(orderItem.quantity * orderItem.price) between :minTotal and :maxTotal',
        {
          minTotal: filter.minTotal,
          maxTotal: filter.maxTotal,
        },
      );
    } else if (filter.minTotal) {
      query.andHaving(
        'SUM(orderItem.quantity * orderItem.price) >= :minTotal',
        {
          minTotal: filter.minTotal,
        },
      );
    } else if (filter.maxTotal) {
      query.andHaving(
        'SUM(orderItem.quantity * orderItem.price) <= :maxTotal',
        {
          maxTotal: filter.maxTotal,
        },
      );
    }

    const orderIds: { order_id: string }[] = await query.getRawMany();

    const orderWithProducts = await Promise.all(
      orderIds.map(async (o) => {
        return (await this.getOrderById({ id: o.order_id })).order;
      }),
    );

    return {
      code: HttpStatus.OK,
      message: COMMON_MESSAGE_ENUM.SUCCESS,
      orders: orderWithProducts,
    };
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<OrderResponse> {
    try {
      const rs: OrderResponse = await this.dataSource.manager.transaction(
        async (manager) => {
          // execute queries using transactionalEntityManager
          const curOrderRepository = manager.getRepository(OrderEntity);
          const curOrderItemRepository = manager.getRepository(OrderItemEntity);

          const { orderProducts, ...orderInfo } = createOrderDto;

          //check duplicated ID
          const duplicatedProducts = orderProducts.filter(
            (p, i) => orderProducts.indexOf(p) !== i,
          );
          if (duplicatedProducts.length > 0) {
            const uniqueDuplicatedProducts = duplicatedProducts.filter(
              (p, i) => duplicatedProducts.indexOf(p) === i,
            );
            return {
              code: HttpStatus.CONFLICT,
              message: `${PRODUCT_ERROR_ENUM.DUPLICATED_PRODUCT_ID}: ${uniqueDuplicatedProducts.join()}`,
              order: null,
            };
          }

          //create order
          const order = curOrderRepository.create(orderInfo);
          const newOrder = await curOrderRepository.save(order);

          //get products
          //update quantity of products
          const updatedProductsRes = await lastValueFrom(
            this.productService.orderRequest({
              items: orderProducts,
            }),
          );
          if (updatedProductsRes.code !== HttpStatus.OK)
            throw updatedProductsRes.message;

          const products = updatedProductsRes.products;

          //create order items
          const orderItems: OrderItemEntity[] = products.map((p) =>
            curOrderItemRepository.create({
              orderId: newOrder.id,
              productId: p.id,
              quantity: orderProducts.find((o) => o.productId === p.id)
                .quantity,
              price: p.price,
              product: p,
            }),
          );
          const newOrderItems: OrderItemEntity[] =
            await curOrderItemRepository.save(orderItems);
          newOrder.orderItems = newOrderItems;

          newOrderItems.every(
            (i) => (i.product = products.find((p) => p.id === i.productId)),
          );

          return {
            code: HttpStatus.OK,
            message: COMMON_MESSAGE_ENUM.SUCCESS,
            order: newOrder,
          };
        },
      );

      return rs;
    } catch (error: any) {
      if (typeof error === 'string')
        return {
          code: HttpStatus.BAD_REQUEST,
          message: error,
          order: null,
        };
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: COMMON_MESSAGE_ENUM.INTERNAL_SERVER_ERROR,
        order: null,
      };
    }
  }

  async updateOrderStatus(
    updateDto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    const { status, orderId } = updateDto;

    const orderRes = await this.getOrderById({ id: orderId });

    if (!orderRes.order) return orderRes;

    if (!(status in ORDER_STATUS_ENUM))
      return {
        code: HttpStatus.BAD_REQUEST,
        message: ORDER_ERROR_ENUM.STATUS_NOT_FOUND,
        order: null,
      };

    // if new status is current status
    if (orderRes.order.status === status)
      return {
        code: HttpStatus.CONFLICT,
        message: ORDER_ERROR_ENUM.DUPLICATE_STATUS,
        order: null,
      };

    const updatedOrder = await this.orderRepository.save({
      id: orderId,
      status: status,
    });

    orderRes.order.status = status;
    orderRes.order.updatedAt = updatedOrder.updatedAt;
    return orderRes;
  }

  async deleteOrder(dto: OrderIdDto): Promise<OrderResponse> {
    const order = await this.orderRepository.findOne({
      where: {
        id: dto.id,
      },
      relations: {
        orderItems: true,
      },
    });

    if (!order)
      return {
        code: HttpStatus.NOT_FOUND,
        message: ORDER_ERROR_ENUM.ORDER_NOT_FOUND,
        order: null,
      };

    try {
      const rs = await this.dataSource.manager.transaction(async (manager) => {
        const curOrderRepository = manager.getRepository(OrderEntity);
        const curOrderItemRepository = manager.getRepository(OrderItemEntity);

        const deletedOrder = await curOrderRepository.softRemove(order);

        order.deletedAt = deletedOrder.deletedAt;
        order.updatedAt = deletedOrder.updatedAt;

        const deletedOrderItems: OrderItemEntity[] = [];

        for (const i of order.orderItems) {
          deletedOrderItems.push(await curOrderItemRepository.softRemove(i));
        }

        deletedOrder.orderItems = deletedOrderItems;

        await this.getProductsInOrder(deletedOrder);

        return deletedOrder;
      });

      return {
        code: HttpStatus.OK,
        message: COMMON_MESSAGE_ENUM.SUCCESS,
        order: rs,
      };
    } catch (error: any) {
      return {
        code: HttpStatus.BAD_REQUEST,
        message: ORDER_ERROR_ENUM.ORDER_ITEM_NOT_FOUND,
        order: null,
      };
    }
  }
}
