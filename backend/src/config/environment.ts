import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',

  // Elasticsearch
  elasticsearch: {
    cloudId: process.env.ES_CLOUD_ID || '',
    apiKey: process.env.ES_API_KEY || '',
    node: process.env.ES_NODE || 'http://localhost:9200',
  },

  // AWS
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // AWS Bedrock
  bedrock: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
    embeddingModel: process.env.BEDROCK_EMBEDDING_MODEL || 'amazon.titan-embed-text-v1',
  },

  // AWS S3
  s3: {
    bucketName: process.env.S3_BUCKET_NAME || 'ghostoffice-civic-data',
    region: process.env.S3_REGION || 'us-east-1',
  },

  // AWS SNS
  sns: {
    civicAlertsTopic: process.env.SNS_CIVIC_ALERTS_TOPIC || '',
    securityAlertsTopic: process.env.SNS_SECURITY_ALERTS_TOPIC || '',
  },

  // Security
  security: {
    apiKeySecret: process.env.API_KEY_SECRET || 'dev-api-key-secret',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Feature Flags
  features: {
    enableBedrock: process.env.ENABLE_BEDROCK === 'true',
    enableLambda: process.env.ENABLE_LAMBDA === 'true',
    enableSns: process.env.ENABLE_SNS === 'true',
  }
};

export type Config = typeof config;
