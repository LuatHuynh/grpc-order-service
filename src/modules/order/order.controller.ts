import { Observable } from 'rxjs';
import { Controller } from '@nestjs/common';

import {
  CreateOrderDto,
  OrderFilterDto,
  OrderIdDto,
  OrderResponse,
  OrderServiceController,
  OrderServiceControllerMethods,
  OrdersResponse,
  UpdateOrderStatusDto,
} from 'clt-jwat-common';
import { OrderService } from './order.service';

@Controller('order')
@OrderServiceControllerMethods()
export class OrderController implements OrderServiceController {
  constructor(private orderService: OrderService) {}

  findOrderById(
    request: OrderIdDto,
  ): OrderResponse | Promise<OrderResponse> | Observable<OrderResponse> {
    return this.orderService.getOrderById(request);
  }
  findOrderWithFilter(
    request: OrderFilterDto,
  ): OrdersResponse | Promise<OrdersResponse> | Observable<OrdersResponse> {
    return this.orderService.getOrderByFilter(request);
  }
  createOrder(
    request: CreateOrderDto,
  ): OrderResponse | Promise<OrderResponse> | Observable<OrderResponse> {
    return this.orderService.createOrder(request);
  }
  updateOrderStatus(
    request: UpdateOrderStatusDto,
  ): OrderResponse | Promise<OrderResponse> | Observable<OrderResponse> {
    return this.orderService.updateOrderStatus(request);
  }
  deleteOrder(
    request: OrderIdDto,
  ): OrderResponse | Promise<OrderResponse> | Observable<OrderResponse> {
    return this.orderService.deleteOrder(request);
  }
}
