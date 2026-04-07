
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5434', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRE ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE ?? '7d',
  },
  mailer: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM || '"No Reply" <noreply@example.com>',
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || 'localhost',
    port: parseInt(process.env.STORAGE_PORT ?? '9000', 10),
    useSSL: process.env.STORAGE_USE_SSL === 'true',
    accessKey: process.env.STORAGE_ACCESS_KEY || process.env.STORAGE_ROOT_USER || '',
    secretKey: process.env.STORAGE_SECRET_KEY || process.env.STORAGE_ROOT_PASSWORD || '',
    bucket: process.env.STORAGE_BUCKET || 'submissions',
    region: process.env.STORAGE_REGION || 'us-east-1',
  },
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE ?? '52428800', 10), // 50MB
    allowedMimeTypes: ['application/pdf'],
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT ?? '5672', 10),
    user: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    jobQueue: process.env.RABBITMQ_JOB_QUEUE || 'pdf_verification_jobs',
    resultQueue: process.env.RABBITMQ_RESULT_QUEUE || 'pdf_verification_results',
  },
});
