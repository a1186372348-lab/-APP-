import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { transactionsRoute } from './routes/transactions';
import { categoriesRoute } from './routes/categories';
import { channelsRoute } from './routes/channels';
import { aiRoute } from './routes/ai';
import { authRoute } from './routes/auth';
import { subscriptionsRoute } from './routes/subscriptions';
import { wechatBotRoute } from './bots/wechat';
import { feishuBotRoute } from './bots/feishu';
import { dingtalkBotRoute } from './bots/dingtalk';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

// Plugins
app.register(fastifyCors, { origin: true });
app.register(fastifyJwt, { secret: process.env.JWT_SECRET || 'change-me-in-production' });
app.register(fastifyMultipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Auth decorator
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Routes
app.register(authRoute, { prefix: '/auth' });
app.register(transactionsRoute, { prefix: '/transactions' });
app.register(categoriesRoute, { prefix: '/categories' });
app.register(channelsRoute, { prefix: '/channels' });
app.register(aiRoute, { prefix: '/ai' });
app.register(subscriptionsRoute, { prefix: '/subscriptions' });

// Bot Webhooks
app.register(wechatBotRoute, { prefix: '/webhooks/wechat' });
app.register(feishuBotRoute, { prefix: '/webhooks/feishu' });
app.register(dingtalkBotRoute, { prefix: '/webhooks/dingtalk' });

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

const start = async () => {
  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);

    // 启动定时任务
    const { startScheduledJobs } = await import('./scheduler');
    startScheduledJobs();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;
