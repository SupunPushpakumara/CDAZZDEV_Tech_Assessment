import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role || 'MEMBER',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.name);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.name);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_12345',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Access Denied. Invalid session.');
      }

      let currentHash = user.refreshTokenHash;
      let oldHash = '';
      let rotationTimestamp = 0;

      if (user.refreshTokenHash.includes('|')) {
        const parts = user.refreshTokenHash.split('|');
        currentHash = parts[0];
        oldHash = parts[1] || '';
        rotationTimestamp = parseInt(parts[2], 10) || 0;
      }

      let isMatch = await bcrypt.compare(refreshToken, currentHash);
      let isGracePeriodMatch = false;

      if (!isMatch && oldHash) {
        isGracePeriodMatch = await bcrypt.compare(refreshToken, oldHash);
        if (isGracePeriodMatch) {
          const timeElapsed = Date.now() - rotationTimestamp;
          const gracePeriodMs = 15000; // 15 seconds grace period
          if (timeElapsed < gracePeriodMs) {
            isMatch = true;
          }
        }
      }

      if (!isMatch) {
        // Reuse detection: Compromised session. Remove token hash to revoke all sessions
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: null },
        });
        throw new UnauthorizedException('Access Denied. Session compromised.');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role, user.name);
      
      const previousHashToStore = isGracePeriodMatch ? oldHash : currentHash;
      const timestampToStore = isGracePeriodMatch ? rotationTimestamp : Date.now();
      await this.updateRefreshToken(user.id, tokens.refreshToken, previousHashToStore, timestampToStore);

      return tokens;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async logout(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    } catch (error) {
      // Gracefully ignore if user record is not found (e.g. database reseeded)
    }
    return { success: true };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async generateTokens(userId: string, email: string, role: string, name: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role, name },
        {
          secret: process.env.JWT_ACCESS_SECRET || 'super_secret_access_key_12345',
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_12345',
          expiresIn: '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string, oldHash: string = '', timestamp: number = Date.now()) {
    const hash = await bcrypt.hash(refreshToken, 10);
    const storedValue = oldHash ? `${hash}|${oldHash}|${timestamp}` : hash;
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: storedValue },
    });
  }
}
