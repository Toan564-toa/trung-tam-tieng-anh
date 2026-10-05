// Gắn thông tin người dùng đã xác thực vào req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        roles: string[];
      };
    }
  }
}

export {};
