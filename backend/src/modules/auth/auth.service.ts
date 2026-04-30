import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async register(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail || !password || password.length < 6) {
      throw new BadRequestException('Email and a password with 6+ characters are required');
    }

    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.createWithWallet({
      email: normalizedEmail,
      passwordHash,
    });

    return this.createSession(user.id, user.email);
  }

  async login(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createSession(user.id, user.email);
  }

  private createSession(userId: number, email: string) {
    const token = this.jwtService.sign({
      sub: userId,
      email,
    });

    return {
      access_token: token,
      user: {
        id: userId,
        email,
      },
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
