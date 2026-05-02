import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: number;
  email: string;
  role: string;
}

const accessSecret = () => process.env.JWT_SECRET!;
const refreshSecret = () => process.env.JWT_REFRESH_SECRET!;

export const signAccessToken = (payload: TokenPayload) =>
  jwt.sign(payload, accessSecret(), { expiresIn: '15m' });

export const signRefreshToken = (payload: TokenPayload) =>
  jwt.sign(payload, refreshSecret(), { expiresIn: '7d' });

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, accessSecret()) as unknown as TokenPayload;

export const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, refreshSecret()) as unknown as TokenPayload;
