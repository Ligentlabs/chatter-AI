import { WebrtcProvider } from 'y-webrtc';
import { Doc } from 'yjs';

import { OnSyncEvent, OnSyncStatusChange, StartDataSyncParams } from '@/types/sync';

import { LobeDBSchemaMap, LocalDBInstance } from './db';

let provider: WebrtcProvider;

let ydoc: Doc;

if (typeof window !== 'undefined') {
  ydoc = new Doc();
}

class SyncBus {
  private ydoc: Doc = ydoc;

  startDataSync = async (params: StartDataSyncParams) => {
    if (provider) {
      provider.destroy();
    }

    this.connect(params);
  };

  connect = (params: StartDataSyncParams) => {
    const {
      channel,
      onSyncEvent,
      onSyncStatusChange,
      user,
      onAwarenessChange,
      signaling = 'wss://y-webrtc-signaling.lobehub.com',
    } = params;

    // clients connected to the same room-name share document updates
    provider = new WebrtcProvider(channel.name, this.ydoc, {
      password: channel.password,
      signaling: [signaling],
    });

    // 当本地设备正确连接到 WebRTC Provider 后，触发 status 事件
    // 当开始连接，则开始监听事件
    provider.on('status', async ({ connected }) => {
      // console.log('connected:', connected);
      if (connected) {
        // console.log('start Observe...');
        this.initObserve(onSyncEvent, onSyncStatusChange);
        onSyncStatusChange?.('ready');
      }
    });

    // 当各方的数据均完成同步后，YJS 对象之间的数据已经一致时，触发 synced 事件
    provider.on('synced', async ({ synced }) => {
      console.log('provider', synced, this.getYMap('messages').size);
      if (synced) {
        onSyncStatusChange?.('syncing');
        await this.initSync();
        onSyncStatusChange?.('synced');
        console.log('yjs init success', this.getYMap('messages').size);
      } else {
        console.log('sync failed,try to reconnect...');
        this.reconnect(params);
      }
    });

    // provider.on('peers', (peers) => {
    //   console.log('currentState:', peers);
    //   if (peers.webrtcPeers.length > 0) {
    //     onSync?.('syncing');
    //   } else {
    //     onSync?.('ready');
    //   }
    // });

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

    return provider;
  };

  reconnect = (params: StartDataSyncParams) => {
    if (provider) {
      provider.awareness.destroy();
      provider.destroy();
    }

    this.connect(params);
  };

  getYMap = (tableKey: keyof LobeDBSchemaMap) => {
    return this.ydoc.getMap(tableKey);
  };

  private initSync = async () => {
    await Promise.all(
      ['sessions', 'sessionGroups', 'topics', 'messages', 'plugins'].map(async (tableKey) =>
        this.loadDataFromDBtoYjs(tableKey as keyof LobeDBSchemaMap),
      ),
    );
  };

  private initObserve = (onEvent: OnSyncEvent, onSyncStatusChange: OnSyncStatusChange) => {
    ['sessions', 'sessionGroups', 'topics', 'messages', 'plugins'].forEach((tableKey) => {
      // listen yjs change
      this.observeYMapChange(tableKey as keyof LobeDBSchemaMap, onEvent, onSyncStatusChange);
    });
  };

  private observeYMapChange = (
    tableKey: keyof LobeDBSchemaMap,
    onEvent: OnSyncEvent,
    onSyncStatusChange: OnSyncStatusChange,
  ) => {
    const table = LocalDBInstance[tableKey];
    const yItemMap = this.getYMap(tableKey);

    yItemMap.observe(async (event) => {
      // abort local change
      if (event.transaction.local) return;

      console.log(`observe ${tableKey} changes:`, event.keysChanged.size);
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

      onSyncStatusChange?.('syncing');
      await Promise.all(pools);
      onSyncStatusChange?.('synced');
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
