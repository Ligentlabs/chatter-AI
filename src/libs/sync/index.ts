import { WebrtcProvider } from 'y-webrtc';
import { Doc } from 'yjs';

import { LocalDBInstance } from '@/database/core';
import { LobeDBSchemaMap } from '@/database/core/db';
import { SyncAwarenessState, SyncUserInfo } from '@/types/sync';

export type OnSyncEvent = (tableKey: keyof LobeDBSchemaMap) => void;

export interface StartDataSyncParams {
  channel: {
    name: string;
    password?: string;
  };
  onAwarenessChange: (state: SyncAwarenessState[]) => void;
  onEvent: OnSyncEvent;
  onSync: (status: 'syncing' | 'synced') => void;
  user: SyncUserInfo;
}

let provider: WebrtcProvider;

class SyncBus {
  private ydoc: Doc;

  constructor() {
    this.ydoc = new Doc();
  }

  startDataSync = async ({
    channel,
    onEvent,
    onSync,
    user,
    onAwarenessChange,
  }: StartDataSyncParams) => {
    // 针对 dev 场景下，provider 会重置，不做二次初始化
    if (provider) return;

    // clients connected to the same room-name share document updates
    provider = new WebrtcProvider(channel.name, this.ydoc, {
      password: channel.password,
      signaling: ['wss://y-webrtc-signaling.lobehub.com'],
    });

    provider.on('synced', async ({ synced }) => {
      if (synced) {
        console.log('WebrtcProvider: synced');
        // this.initObserve(onEvent);
      }
    });

    provider.on('status', async ({ connected }) => {
      // 当开始连接，则初始化数据
      if (connected) {
        onSync?.('syncing');
        console.log('start init data...');
        this.initObserve(onEvent);
        await this.initSync();
        console.log('yjs init success');
        onSync?.('synced');
      }
    });

    const awareness = provider.awareness;

    awareness.setLocalState({ clientID: awareness.clientID, user });

    awareness.on('change', () => {
      const state = Array.from(awareness.getStates().values()).map((s) => ({
        ...s.user,
        clientID: s.clientID,
        current: s.clientID === awareness.clientID,
      }));

      onAwarenessChange?.(state);
    });
  };

  getYMap = (tableKey: keyof LobeDBSchemaMap) => {
    return this.ydoc.getMap(tableKey);
  };

  private initSync = async () => {
    await Promise.all(
      ['sessions', 'sessionGroups', 'topics', 'messages', 'plugins'].map(async (tableKey) => {
        return this.loadDataFromDBtoYjs(tableKey as keyof LobeDBSchemaMap);
      }),
    );
  };

  private initObserve = (onEvent: OnSyncEvent) => {
    ['sessions', 'sessionGroups', 'topics', 'messages', 'plugins'].forEach((tableKey) => {
      // listen yjs change
      this.observeYMapChange(tableKey as keyof LobeDBSchemaMap, onEvent);
    });
  };

  private observeYMapChange = (tableKey: keyof LobeDBSchemaMap, onEvent: OnSyncEvent) => {
    const table = LocalDBInstance[tableKey];
    const yItemMap = this.getYMap(tableKey);

    yItemMap.observe(async (event) => {
      // abort local change
      if (event.transaction.local) return;

      // console.log(`observe ${tableKey} changes:`, event.keysChanged.size);
      const pools = Array.from(event.keys).map(async ([id, payload]) => {
        const item: any = yItemMap.get(id);

        switch (payload.action) {
          case 'add':
          case 'update': {
            const itemInTable = await table.get(id);
            if (!itemInTable) {
              await table.add(item, id);
            } else {
              await table.update(id, item);
            }
            break;
          }

          case 'delete': {
            await table.delete(id);
            break;
          }
        }
      });

      await Promise.all(pools);
      onEvent?.(tableKey);
    });
  };

  private loadDataFromDBtoYjs = async (tableKey: keyof LobeDBSchemaMap) => {
    const table = LocalDBInstance[tableKey];
    const items = await table.toArray();
    const yItemMap = this.getYMap(tableKey);

    items.forEach((item) => {
      // TODO: 需要改表，所有 table 都需要有 id 字段
      yItemMap.set(item.id || (item as any).identifier, item);
    });
  };
}

export const syncBus = new SyncBus();
