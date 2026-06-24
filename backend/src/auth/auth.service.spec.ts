import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a new user and return tokens on successful registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'MEMBER',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-xyz')
        .mockResolvedValueOnce('refresh-token-xyz');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token-xyz');
      expect(result.refreshToken).toBe('refresh-token-xyz');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when email is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'stored-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user data and tokens on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'MEMBER',
        passwordHash: 'stored-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-refresh-hash');
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException when refresh token is invalid/expired', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user has no stored refresh hash (logged out)', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        refreshTokenHash: null, // User has logged out
      });

      await expect(service.refresh('some-valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should clear refresh hash and throw when token reuse is detected', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'MEMBER',
        name: 'Test',
        refreshTokenHash: 'stored-hash',
      });
      // Token doesn't match stored hash → reuse detection
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrisma.user.update.mockResolvedValue({});

      await expect(service.refresh('reused-old-token')).rejects.toThrow(
        UnauthorizedException,
      );

      // Should have cleared the hash (revoke all sessions)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshTokenHash: null },
      });
    });

    it('should rotate tokens and return new pair on valid refresh', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'MEMBER',
        name: 'Test',
        refreshTokenHash: 'stored-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Token matches
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockJwtService.signAsync
        .mockResolvedValueOnce('rotated-access-token')
        .mockResolvedValueOnce('rotated-refresh-token');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('rotated-access-token');
      expect(result.refreshToken).toBe('rotated-refresh-token');
    });

    it('should rotate tokens and return new pair if refresh token matches old hash and is within grace period', async () => {
      const now = Date.now();
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'MEMBER',
        name: 'Test',
        refreshTokenHash: `new-hash|old-hash|${now - 5000}`, // Rotated 5s ago (within 15s grace period)
      });
      // Mock bcrypt compare: matches old hash, not current hash
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false) // current-hash comparison
        .mockResolvedValueOnce(true);  // old-hash comparison
      (bcrypt.hash as jest.Mock).mockResolvedValue('rotated-hash');
      mockJwtService.signAsync
        .mockResolvedValueOnce('rotated-access-token')
        .mockResolvedValueOnce('rotated-refresh-token');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.refresh('old-valid-token-in-grace-period');

      expect(result.accessToken).toBe('rotated-access-token');
      expect(result.refreshToken).toBe('rotated-refresh-token');
      // Should write new-hash|old-hash|timestamp (preserving original old-hash and timestamp)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshTokenHash: `rotated-hash|old-hash|${now - 5000}` },
      });
    });

    it('should throw and clear hash if refresh token matches old hash but is outside grace period', async () => {
      const now = Date.now();
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'MEMBER',
        name: 'Test',
        refreshTokenHash: `new-hash|old-hash|${now - 20000}`, // Rotated 20s ago (outside 15s grace period)
      });
      // Mock bcrypt compare: matches old hash, not current hash
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false) // current-hash comparison
        .mockResolvedValueOnce(true);  // old-hash comparison
      mockPrisma.user.update.mockResolvedValue({});

      await expect(service.refresh('old-expired-token-outside-grace-period')).rejects.toThrow(
        UnauthorizedException,
      );

      // Should have cleared hash
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshTokenHash: null },
      });
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash for the user', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.logout('user-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshTokenHash: null },
      });
    });

    it('should return success even if user record is not found', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Record not found'));

      const result = await service.logout('nonexistent-user');

      expect(result).toEqual({ success: true });
    });
  });
});
