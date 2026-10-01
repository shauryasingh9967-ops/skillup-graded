require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  tzOffsetMinutes: Number.isFinite(parseInt(process.env.TZ_OFFSET_MINUTES, 10))
    ? parseInt(process.env.TZ_OFFSET_MINUTES, 10)
    : 330,
};
env.isProd = env.nodeEnv === 'production';

env.assertRequired = () => {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }
  if (env.jwtSecret.length < 16) {
    throw new Error('JWT_SECRET is too short. Use at least 32 random characters.');
  }
};

module.exports = env;
