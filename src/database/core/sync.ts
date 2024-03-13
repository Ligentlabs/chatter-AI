import pMap from 'p-map';
import { WebrtcProvider } from 'y-webrtc';
import { Doc } from 'yjs';
import { YArray } from 'yjs/dist/src/types/YArray';

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

  connect = async (params: StartDataSyncParams) => {
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
      console.log('provider', synced);

      if (synced) {
        onSyncStatusChange?.('syncing');
        await this.initSync();
        onSyncStatusChange?.('synced');
        console.log('yjs init success');
      } else {
        console.log('sync failed,try to reconnect...');
        provider.disconnect();
        await this.reconnect(params);
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
    onAwarenessChange?.([{ ...user, clientID: awareness.clientID, current: true }]);

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

  reconnect = async (params: StartDataSyncParams) => {
    if (provider) {
      provider.destroy();
    }

    console.log('try to reconnect...');
    await this.connect(params);
  };

  getYMap = (tableKey: keyof LobeDBSchemaMap) => {
    return this.ydoc.getArray(tableKey);
  };

  private initSync = async () => {
    await Promise.all(
      ['sessions', 'sessionGroups', 'topics', 'messages', 'plugins'].map(async (tableKey) =>
        this.loadDataFromDBtoYjs(tableKey as keyof LobeDBSchemaMap),
      ),
    );
  };

  private initObserve = (onEvent: OnSyncEvent, onSyncStatusChange: OnSyncStatusChange) => {
    ['sessions', 'sessionGroups', 'topics', 'plugins', 'messages'].forEach((tableKey) => {
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

      console.log(`observe ${tableKey} changes:`, event.target.length, event);
      const addPools = Array.from(event.changes.added).map(async (item) => {
        const array = item.parent as YArray<any>;

        // @ts-ignore
        await table.bulkPut(array.toArray());
      });

      onSyncStatusChange?.('syncing');

      await Promise.all(addPools);

      onSyncStatusChange?.('synced');
      onEvent?.(tableKey);
    });
  };

  private loadDataFromDBtoYjs = async (tableKey: keyof LobeDBSchemaMap) => {
    const table = LocalDBInstance[tableKey];
    const items = await table.toArray();
    const yData = this.getYMap(tableKey);

    // 定义每批次最多包含的数据条数
    const batchSize = 50;

    // 计算总批次数
    const totalBatches = Math.ceil(items.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      // 计算当前批次的起始和结束索引
      const start = i * batchSize;
      const end = start + batchSize;

      // 获取当前批次的数据
      const batchItems = items.slice(start, end);

      // 将当前批次的数据推送到 Yjs 中
      yData.push(batchItems);
    }

    console.log('[DB]:', tableKey, yData.toArray());

    // items.forEach((item) => {
    //   // TODO: 需要改表，所有 table 都需要有 id 字段
    //   yData.set(item.id || (item as any).identifier, item);
    // });
  };
}

export const syncBus = new SyncBus();
