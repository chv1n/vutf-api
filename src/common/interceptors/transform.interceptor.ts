import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any; // เพิ่ม type meta เผื่อไว้
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // 1. เช็คว่าสิ่งที่ส่งมา เป็น Object ที่มี key ชื่อ 'data' และ 'meta' หรือไม่? (กรณี Pagination)
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            ...data, // แตก data กับ meta ออกมาวางในระดับเดียวกัน
          };
        }

        // 2. ถ้าเป็นเคสปกติ (ดึงข้อมูลชิ้นเดียว, login) ให้ห่อด้วย data ตามปกติ
        return {
          success: true,
          data: data,
        };
      }),
    );
  }
}