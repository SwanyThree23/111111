import { Request, Response, NextFunction } from 'express';

const PLATFORM_FEE = 0.10;

export function splitGuard(req: Request, res: Response, next: NextFunction): void {
  const { grossAmount, applicationFeeAmount } = req.body as { grossAmount?: number; applicationFeeAmount?: number };
  if (grossAmount !== undefined && applicationFeeAmount !== undefined) {
    const grossCents = Math.round(grossAmount * 100);
    const expectedFee = Math.floor(grossCents * PLATFORM_FEE);
    if (applicationFeeAmount !== expectedFee) {
      res.status(400).json({ error: 'Split validation failed: fee does not match 90/10 split' });
      return;
    }
  }
  next();
}
