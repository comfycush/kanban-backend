import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './strategies/jwt.strategy';

export function decodeJwtPayload(
  jwt: JwtService,
  token: string,
): JwtPayload | null {
  return jwt.decode(token);
}
