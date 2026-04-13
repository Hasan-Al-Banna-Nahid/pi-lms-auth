import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (info instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          success: false,
          message: 'Your session has expired. Please login again.',
          error: 'token_expired',
        });
      }

      if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException({
          success: false,
          message: 'Invalid token provided.',
          error: 'invalid_token',
        });
      }

      throw new UnauthorizedException({
        success: false,
        message:
          info?.message ||
          'Authentication failed. Please provide a valid token.',
        error: 'unauthorized',
      });
    }

    return user;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    return result;
  }
}
