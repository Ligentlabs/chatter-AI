import { Pool, neonConfig } from '@neondatabase/serverless';
import { NeonDatabase, drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import { serverDBEnv } from '@/config/db';
import { isServerMode } from '@/const/version';

import * as schema from '../schemas/lobechat';

const getDBInstance = (): NeonDatabase<typeof schema> => {
  if (!isServerMode) return {} as any;

  if (!serverDBEnv.KEY_VAULTS_SECRET_KEY) {
    throw new Error('`KEY_VAULTS_SECRET_KEY` is not set, please set it in your environment');
  }

  const isTest = process.env.NODE_ENV === 'test';

  if (isTest || process.env.MIGRATION_DB === '1') {
    // https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined
    neonConfig.webSocketConstructor = ws;
  }

  const connectionString = isTest ? serverDBEnv.DATABASE_TEST_URL : serverDBEnv.DATABASE_URL;

  if (!connectionString) {
    const string = isTest ? 'DATABASE_TEST_URL' : 'DATABASE_URL';
    throw new Error(`You are try to use database, but "${string}" is not set correctly`);
  }
  // const client = neon(connectionString);
  const client = new Pool({ connectionString });

  return drizzle(client, { schema });
};

export const serverDB = getDBInstance();
