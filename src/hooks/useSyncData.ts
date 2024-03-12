import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';
import { useSessionStore } from '@/store/session';

export const useEnabledDataSync = () => {
  const [useEnabledSync] = useGlobalStore((s) => [s.useEnabledSync]);

  const [refreshMessages, refreshTopic] = useChatStore((s) => [s.refreshMessages, s.refreshTopic]);
  const [refreshSessions] = useSessionStore((s) => [s.refreshSessions]);

  useEnabledSync((tableKey, id, payload) => {
    console.log(`[${tableKey}] detect ${payload.action}:`, id);

    switch (tableKey) {
      case 'messages': {
        refreshMessages();
        break;
      }

      case 'topics': {
        refreshTopic();
        break;
      }

      case 'sessions': {
        refreshSessions();
        break;
      }

      default: {
        break;
      }
    }
  });
};
