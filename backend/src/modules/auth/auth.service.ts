import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(email: string, password: string) {
    // ⚠️ depois vamos substituir por banco (Prisma)
    const fakeUser = {
      id: 1,
      email: 'test@test.com',
      password: await bcrypt.hash('123456', 10),
    };

    if (email !== fakeUser.email) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      fakeUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = this.jwtService.sign({
      sub: fakeUser.id,
      email: fakeUser.email,
    });

    return {
      access_token: token,
    };
  }
}