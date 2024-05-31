import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import { fetchErrorNotification } from '@/components/FetchErrorNotification';
import type { EdgeRouter, LambdaRouter } from '@/server/routers';
import { createHeaderWithAuth } from '@/services/_auth';
import { withBasePath } from '@/utils/basePath';

export const edgeClient = createTRPCClient<EdgeRouter>({
  links: [
    httpBatchLink({
      headers: async () => createHeaderWithAuth(),
      transformer: superjson,
      url: withBasePath('/trpc/edge'),
    }),
  ],
});

export type ErrorResponse = ErrorItem[];

export interface ErrorItem {
  error: {
    json: {
      code: number;
      data: Data;
      message: string;
    };
  };
}

export interface Data {
  code: string;
  httpStatus: number;
  path: string;
  stack: string;
}

export const lambdaClient = createTRPCClient<LambdaRouter>({
  links: [
    httpBatchLink({
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (response.ok) return response;

        const errorRes: ErrorResponse = await response.clone().json();

        errorRes.forEach((item) => {
          const errorData = item.error.json;

          const status = errorData.data.httpStatus;

          fetchErrorNotification.error({ errorMessage: errorData.message, status });
        });

        return response;
      },
      transformer: superjson,
      url: '/trpc/lambda',
    }),
  ],
});
