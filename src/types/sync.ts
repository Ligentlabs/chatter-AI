export interface SyncUserInfo {
  browser?: string;
  device?: string;
  id: string;
  isMobile: boolean;
  name?: string;
  os?: string;
}

export interface SyncAwarenessState extends SyncUserInfo {
  clientID: number;
  current: boolean;
}
