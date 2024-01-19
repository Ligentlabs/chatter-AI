export const encodeAsync = async (str: string) =>
  new Promise<number>((resolve) => {
    // 使用 Webpack 的 asset/resource 类型来加载 worker
    const worker = new Worker(new URL('@/workers/tokenizer.worker.ts', import.meta.url));

    // eslint-disable-next-line unicorn/prefer-add-event-listener
    worker.onmessage = (event) => {
      resolve(event.data);
      worker.terminate();
    };

    worker.postMessage(str);
  });
