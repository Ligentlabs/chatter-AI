import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';

export const useEnabledDataSync = () => {
  const [useEnabledSync] = useGlobalStore((s) => [s.useEnabledSync]);

  const [refreshMessages, refreshTopic] = useChatStore((s) => [s.refreshMessages, s.refreshTopic]);

  useEnabledSync((tableKey, id, payload) => {
    console.log(`detect changes:[${tableKey}] ${payload.action}`, id);

    switch (tableKey) {
      case 'messages': {
        refreshMessages();
        break;
      }
      case 'topics': {
        refreshTopic();
        break;
      }

      default: {
        break;
      }
    }
  });
};
