// use self to represent DedicatedWorkerGlobalScope
const ctx: Worker = self as any;

ctx.addEventListener('message', async (event) => {
  const { data } = event;

  const { encode } = await import('gpt-tokenizer');
  const result = encode(data);
  ctx.postMessage(result.length);
});

// ensure TypeScript treats this file as a module
export {};
