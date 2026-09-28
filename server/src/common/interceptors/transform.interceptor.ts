import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Envelope<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Envelope<T>> {
    return next.handle().pipe(
      map((result) => {
        return { success: true, data: result } as Envelope<T>;
      }),
    );
  }
}
