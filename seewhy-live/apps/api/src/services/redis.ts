import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

export default redis;
