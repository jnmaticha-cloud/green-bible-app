// Authentication Middleware
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    
    // Token verification logic would go here
    req.user = { id: 'user-id', email: 'user@example.com' };
    next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    authenticate(req, res, next);
}
