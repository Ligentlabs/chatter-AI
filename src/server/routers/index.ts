/**
 * This file contains the root router of lobe chat tRPC-backend
 */
import { publicProcedure, router } from '@/libs/trpc';

import { configRouter } from './edge/config';
import { uploadRouter } from './edge/upload';
// router that connect to db
import { fileRouter } from './lambda/file';
import { messageRouter } from './lambda/message';
import { pluginRouter } from './lambda/plugin';
import { sessionRouter } from './lambda/session';
import { sessionGroupRouter } from './lambda/sessionGroup';
import { topicRouter } from './lambda/topic';
import { userRouter } from './lambda/user';

export const edgeRouter = router({
  config: configRouter,
  healthcheck: publicProcedure.query(() => "i'm live!"),
  upload: uploadRouter,
});

export type EdgeRouter = typeof edgeRouter;

export const lambdaRouter = router({
  file: fileRouter,
  healthcheck: publicProcedure.query(() => "i'm live!"),
  message: messageRouter,
  plugin: pluginRouter,
  session: sessionRouter,
  sessionGroup: sessionGroupRouter,
  topic: topicRouter,
  user: userRouter,
});

export type LambdaRouter = typeof lambdaRouter;
