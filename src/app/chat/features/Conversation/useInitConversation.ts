import { useEffect } from 'react';

import { useChatStore } from '@/store/chat';
import { usePluginStore } from '@/store/plugin';
import { useSessionStore } from '@/store/session';
import { agentSelectors } from '@/store/session/selectors';

export const useInitConversation = () => {
  const [sessionId] = useSessionStore((s) => [s.activeId]);
  const plugins = useSessionStore((s) => agentSelectors.currentAgentPlugins(s));
  const [activeTopicId, useFetchMessages, useFetchTopics] = useChatStore((s) => [
    s.activeTopicId,
    s.useFetchMessages,
    s.useFetchTopics,
  ]);

  useFetchMessages(sessionId, activeTopicId);
  useFetchTopics(sessionId);

  const [useFetchPluginStore, checkPluginsIsInstalled] = usePluginStore((s) => [
    s.useFetchPluginStore,
    s.useCheckPluginsIsInstalled,
  ]);

  useFetchPluginStore();
  checkPluginsIsInstalled(plugins);

  useEffect(() => {
    useChatStore.persist.rehydrate();
  }, []);
};
