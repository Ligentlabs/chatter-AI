import { useEffect, useRef, useState } from 'react';

export const useTokenCount = (input: string = '') => {
  const workerRef = useRef<Worker>();
  const timeRef = useRef<number>(Date.now());
  const [value, setNum] = useState(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL('@/workers/tokenizer.worker.ts', import.meta.url));

    const onMessageReceived = (event: MessageEvent) => {
      setNum(event.data);
      console.log('useTokenCount', Date.now() - timeRef.current);
    };

    // Attach the callback function as an event listener.
    workerRef.current.addEventListener('message', onMessageReceived);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage(input);
    timeRef.current = Date.now();
  }, [input]);

  return value;
};
