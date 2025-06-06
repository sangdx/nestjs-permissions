export interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  requestValidation: {
    maxBodySize: number; // in bytes
    requireJsonContent: boolean;
    validateContentType: boolean;
  };
}
