import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '../services/config.service';
import { SecurityConfig } from '../interfaces/security.interface';

type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void;

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly helmetMiddleware: any;
  private readonly rateLimiter: any;
  private readonly config: SecurityConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.getSecurityConfig();

    // Initialize helmet with configuration
    if (this.config.helmet.enabled) {
      this.helmetMiddleware = helmet({
        contentSecurityPolicy: this.config.helmet.contentSecurityPolicy,
        crossOriginEmbedderPolicy: this.config.helmet.crossOriginEmbedderPolicy,
        crossOriginOpenerPolicy: this.config.helmet.crossOriginOpenerPolicy,
        crossOriginResourcePolicy: this.config.helmet.crossOriginResourcePolicy 
          ? { policy: 'same-site' } 
          : false,
        dnsPrefetchControl: this.config.helmet.dnsPrefetchControl,
        frameguard: this.config.helmet.frameguard ? { action: 'deny' } : false,
        hidePoweredBy: this.config.helmet.hidePoweredBy,
        hsts: this.config.helmet.hsts ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        } : false,
        ieNoOpen: this.config.helmet.ieNoOpen,
        noSniff: this.config.helmet.noSniff,
        referrerPolicy: this.config.helmet.referrerPolicy 
          ? { policy: 'strict-origin-when-cross-origin' } 
          : false,
        xssFilter: this.config.helmet.xssFilter,
      });
    }

    // Configure rate limiting
    if (this.config.rateLimit.enabled) {
      this.rateLimiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs,
        max: this.config.rateLimit.max,
        message: 'Too many requests from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
      });
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    const chain: MiddlewareFunction[] = [];

    // Apply helmet security headers
    if (this.config.helmet.enabled) {
      chain.push((req: Request, res: Response, next: NextFunction) => {
        this.helmetMiddleware(req, res, next);
      });
    }

    // Apply rate limiting
    if (this.config.rateLimit.enabled) {
      chain.push((req: Request, res: Response, next: NextFunction) => {
        this.rateLimiter(req, res, next);
      });
    }

    // Apply CORS
    if (this.config.cors.enabled) {
      chain.push((req: Request, res: Response, next: NextFunction) => {
        const origin = req.headers.origin;
        if (origin && this.isAllowedOrigin(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Methods', this.config.cors.allowedMethods.join(','));
          res.setHeader('Access-Control-Allow-Headers', this.config.cors.allowedHeaders.join(','));
          res.setHeader('Access-Control-Expose-Headers', this.config.cors.exposedHeaders.join(','));
          if (this.config.cors.credentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
          }
        }
        next();
      });
    }

    // Apply request validation
    if (this.config.requestValidation.validateContentType) {
      chain.push((req: Request, res: Response, next: NextFunction) => {
        try {
          this.validateRequest(req);
          next();
        } catch (error) {
          next(error);
        }
      });
    }

    // Execute middleware chain
    const executeChain = (index: number) => {
      if (index < chain.length) {
        chain[index](req, res, (error?: any) => {
          if (error) {
            next(error);
          } else {
            executeChain(index + 1);
          }
        });
      } else {
        next();
      }
    };

    executeChain(0);
  }

  private validateRequest(req: Request) {
    // Validate Content-Type for POST/PUT/PATCH requests
    if (this.config.requestValidation.requireJsonContent) {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid Content-Type. Expected application/json');
        }
      }
    }

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > this.config.requestValidation.maxBodySize) {
      throw new Error('Request body too large');
    }
  }

  private isAllowedOrigin(origin: string): boolean {
    return this.config.cors.allowedOrigins.includes(origin) || 
           this.config.cors.allowedOrigins.includes('*');
  }
} 