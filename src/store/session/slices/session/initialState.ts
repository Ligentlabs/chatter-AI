import { DEFAULT_AGENT_META } from '@/const/meta';
import { DEFAULT_AGENT_CONFIG } from '@/const/settings';
import { LobeAgentConfig } from '@/types/agent';
import {
  CustomSessionGroup,
  LobeAgentSession,
  LobeSessionGroups,
  LobeSessionType,
} from '@/types/session';

export const initLobeSession: LobeAgentSession = {
  config: DEFAULT_AGENT_CONFIG,
  createdAt: Date.now(),
  id: '',
  meta: DEFAULT_AGENT_META,
  type: LobeSessionType.Agent,
  updatedAt: Date.now(),
};

export interface SessionState {
  /**
   * @title 当前活动的会话
   * @description 当前正在编辑或查看的会话
   */
  activeId: string;
  agentConfig: LobeAgentConfig;
  customSessionGroups: CustomSessionGroup[];
  defaultSessions: LobeAgentSession[];
  isAgentConfigInit: boolean;
  isMobile?: boolean;
  isSearching: boolean;
  isSessionsFirstFetchFinished: boolean;
  pinnedSessions: LobeAgentSession[];
  searchKeywords: string;
  sessionGroups: LobeSessionGroups;
  sessionSearchKeywords?: string;
  /**
   * it means defaultSessions
   */
  sessions: LobeAgentSession[];
}

export const initialSessionState: SessionState = {
  activeId: 'inbox',
  agentConfig: DEFAULT_AGENT_CONFIG,
  customSessionGroups: [],
  defaultSessions: [],
  isAgentConfigInit: false,
  isMobile: false,
  isSearching: false,
  isSessionsFirstFetchFinished: false,
  pinnedSessions: [],
  searchKeywords: '',
  sessionGroups: [],
  sessions: [],
};
