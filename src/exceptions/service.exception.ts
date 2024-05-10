import { RpcException } from '@nestjs/microservices';

interface ExceptionProps {
  code: string | number;
  message: string;
}

export class ServiceRpcException extends RpcException {
  constructor({ code, message }: ExceptionProps) {
    super({
      message: message,
      code: code,
    });
  }
}
