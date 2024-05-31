import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { serverDB } from '../../core/db';
import {
  files,
  filesToMessages,
  messagePlugins,
  messageTTS,
  messages,
  sessions,
  topics,
  users,
} from '../../schemas/lobechat';
import { MessageModel } from '../message';

const userId = 'message-db';
const messageModel = new MessageModel(userId);

beforeEach(async () => {
  // 在每个测试用例之前，清空表
  await serverDB.delete(users);

  await serverDB.insert(users).values([{ id: userId }, { id: '456' }]);
});

afterEach(async () => {
  // 在每个测试用例之后，清空表
  await serverDB.delete(users);
});

describe('MessageModel', () => {
  describe('query', () => {
    it('should query messages by user ID', async () => {
      // 创建测试数据
      await serverDB.insert(messages).values([
        { id: '1', userId, role: 'user', content: 'message 1', createdAt: new Date('2023-01-01') },
        { id: '2', userId, role: 'user', content: 'message 2', createdAt: new Date('2023-02-01') },
        {
          id: '3',
          userId: '456',
          role: 'user',
          content: 'message 3',
          createdAt: new Date('2023-03-01'),
        },
      ]);

      // 调用 query 方法
      const result = await messageModel.query();

      // 断言结果
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should return empty messages if not match the user ID', async () => {
      // 创建测试数据
      await serverDB.insert(messages).values([
        { id: '1', userId: '456', role: 'user', content: '1', createdAt: new Date('2023-01-01') },
        { id: '2', userId: '456', role: 'user', content: '2', createdAt: new Date('2023-02-01') },
        { id: '3', userId: '456', role: 'user', content: '3', createdAt: new Date('2023-03-01') },
      ]);

      // 调用 query 方法
      const result = await messageModel.query();

      // 断言结果
      expect(result).toHaveLength(0);
    });

    it('should query messages with pagination', async () => {
      // 创建测试数据
      await serverDB.insert(messages).values([
        { id: '1', userId, role: 'user', content: 'message 1', createdAt: new Date('2023-01-01') },
        { id: '2', userId, role: 'user', content: 'message 2', createdAt: new Date('2023-02-01') },
        { id: '3', userId, role: 'user', content: 'message 3', createdAt: new Date('2023-03-01') },
      ]);

      // 测试分页
      const result1 = await messageModel.query({ current: 0, pageSize: 2 });
      expect(result1).toHaveLength(2);

      const result2 = await messageModel.query({ current: 1, pageSize: 1 });
      expect(result2).toHaveLength(1);
      expect(result2[0].id).toBe('2');
    });

    it('should filter messages by sessionId', async () => {
      // 创建测试数据
      await serverDB.insert(sessions).values([
        { id: 'session1', userId },
        { id: 'session2', userId },
      ]);
      await serverDB.insert(messages).values([
        {
          id: '1',
          userId,
          role: 'user',
          sessionId: 'session1',
          content: 'message 1',
          createdAt: new Date('2022-02-01'),
        },
        {
          id: '2',
          userId,
          role: 'user',
          sessionId: 'session1',
          content: 'message 2',
          createdAt: new Date('2023-02-02'),
        },
        { id: '3', userId, role: 'user', sessionId: 'session2', content: 'message 3' },
      ]);

      // 测试根据 sessionId 过滤
      const result = await messageModel.query({ sessionId: 'session1' });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should filter messages by topicId', async () => {
      // 创建测试数据
      const sessionId = 'session1';
      await serverDB.insert(sessions).values([{ id: sessionId, userId }]);
      const topicId = 'topic1';
      await serverDB.insert(topics).values([
        { id: topicId, sessionId, userId },
        { id: 'topic2', sessionId, userId },
      ]);

      await serverDB.insert(messages).values([
        { id: '1', userId, role: 'user', topicId, content: '1', createdAt: new Date('2022-04-01') },
        { id: '2', userId, role: 'user', topicId, content: '2', createdAt: new Date('2023-02-01') },
        { id: '3', userId, role: 'user', topicId: 'topic2', content: 'message 3' },
      ]);

      // 测试根据 topicId 过滤
      const result = await messageModel.query({ topicId });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should query messages with join', async () => {
      // 创建测试数据
      await serverDB.transaction(async (trx) => {
        await trx.insert(messages).values([
          {
            id: '1',
            userId,
            role: 'user',
            content: 'message 1',
            createdAt: new Date('2023-01-01'),
          },
          {
            id: '2',
            userId,
            role: 'user',
            content: 'message 2',
            createdAt: new Date('2023-02-01'),
          },
          {
            id: '3',
            userId: '456',
            role: 'user',
            content: 'message 3',
            createdAt: new Date('2023-03-01'),
          },
        ]);
        await trx.insert(files).values([
          { id: 'f-0', url: 'abc', name: 'file-1', userId, fileType: 'image/png', size: 1000 },
          { id: 'f-1', url: 'abc', name: 'file-1', userId, fileType: 'image/png', size: 100 },
          { id: 'f-3', url: 'abc', name: 'file-3', userId, fileType: 'image/png', size: 400 },
        ]);
        await trx
          .insert(messageTTS)
          .values([{ id: '1' }, { id: '2', voice: 'a', fileId: 'f-1', contentMd5: 'abc' }]);

        await trx.insert(filesToMessages).values([
          { fileId: 'f-0', messageId: '1' },
          { fileId: 'f-3', messageId: '1' },
        ]);
      });

      // 调用 query 方法
      const result = await messageModel.query();

      // 断言结果
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[0].files).toEqual(['f-0', 'f-3']);

      expect(result[1].id).toBe('2');
      expect(result[1].files).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find message by ID', async () => {
      // 创建测试数据
      await serverDB.insert(messages).values([
        { id: '1', userId, role: 'user', content: 'message 1' },
        { id: '2', userId: '456', role: 'user', content: 'message 2' },
      ]);

      // 调用 findById 方法
      const result = await messageModel.findById('1');

      // 断言结果
      expect(result?.id).toBe('1');
      expect(result?.content).toBe('message 1');
    });

    it('should return undefined if message does not belong to user', async () => {
      // 创建测试数据
      await serverDB
        .insert(messages)
        .values([{ id: '1', userId: '456', role: 'user', content: 'message 1' }]);

      // 调用 findById 方法
      const result = await messageModel.findById('1');

      // 断言结果
      expect(result).toBeUndefined();
    });
  });

  describe('queryBySessionId', () => {
    it('should query messages by sessionId', async () => {
      // 创建测试数据
      const sessionId = 'session1';
      await serverDB.insert(sessions).values([
        { id: 'session1', userId },
        { id: 'session2', userId },
      ]);
      await serverDB.insert(messages).values([
        {
          id: '1',
          userId,
          role: 'user',
          sessionId,
          content: 'message 1',
          createdAt: new Date('2022-01-01'),
        },
        {
          id: '2',
          userId,
          role: 'user',
          sessionId,
          content: 'message 2',
          createdAt: new Date('2023-02-01'),
        },
        { id: '3', userId, role: 'user', sessionId: 'session2', content: 'message 3' },
      ]);

      // 调用 queryBySessionId 方法
      const result = await messageModel.queryBySessionId(sessionId);

      // 断言结果
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });

  describe('queryByKeyWord', () => {
    it('should query messages by keyword', async () => {
      // 创建测试数据
      await serverDB.insert(messages).values([
        { id: '1', userId, role: 'user', content: 'apple', createdAt: new Date('2022-02-01') },
        { id: '2', userId, role: 'user', content: 'banana' },
        { id: '3', userId, role: 'user', content: 'pear' },
        { id: '4', userId, role: 'user', content: 'apple pie', createdAt: new Date('2024-02-01') },
      ]);

      // 测试查询包含特定关键字的消息
      const result = await messageModel.queryByKeyword('apple');

      // 断言结果
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('4');
      expect(result[1].id).toBe('1');
    });

    it('should return empty array when keyword is empty', async () => {
      // 创建测试数据
      await serverDB.insert(messages).values([
        { id: '1', userId, role: 'user', content: 'apple' },
        { id: '2', userId, role: 'user', content: 'banana' },
        { id: '3', userId, role: 'user', content: 'pear' },
        { id: '4', userId, role: 'user', content: 'apple pie' },
      ]);

      // 测试当关键字为空时返回空数组
      const result = await messageModel.queryByKeyword('');

      // 断言结果
      expect(result).toHaveLength(0);
    });
  });

  describe('createMessage', () => {
    it('should create a new message', async () => {
      // 调用 createMessage 方法
      await messageModel.create({ role: 'user', content: 'new message', sessionId: '1' });

      // 断言结果
      const result = await serverDB
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('new message');
    });

    it('should create a message', async () => {
      const sessionId = 'session1';
      await serverDB.insert(sessions).values([{ id: sessionId, userId }]);

      const result = await messageModel.create({
        content: 'message 1',
        role: 'user',
        sessionId: 'session1',
      });

      expect(result.id).toBeDefined();
      expect(result.content).toBe('message 1');
      expect(result.role).toBe('user');
      expect(result.sessionId).toBe('session1');
      expect(result.userId).toBe(userId);
    });

    it('should generate message ID automatically', async () => {
      // 调用 createMessage 方法
      await messageModel.create({
        role: 'user',
        content: 'new message',
        sessionId: '1',
      });

      // 断言结果
      const result = await serverDB
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .execute();
      expect(result[0].id).toBeDefined();
      expect(result[0].id).toHaveLength(18);
    });
  });

  describe('batchCreateMessages', () => {
    it('should batch create messages', async () => {
      // 准备测试数据
      const newMessages = [
        { id: '1', role: 'user', content: 'message 1' },
        { id: '2', role: 'assistant', content: 'message 2' },
      ];

      // 调用 batchCreateMessages 方法
      await messageModel.batchCreate(newMessages);

      // 断言结果
      const result = await serverDB
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .execute();
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('message 1');
      expect(result[1].content).toBe('message 2');
    });
  });

  describe('updateMessage', () => {
    it('should update message content', async () => {
      // 创建测试数据
      await serverDB
        .insert(messages)
        .values([{ id: '1', userId, role: 'user', content: 'message 1' }]);

      // 调用 updateMessage 方法
      await messageModel.update('1', { content: 'updated message' });

      // 断言结果
      const result = await serverDB.select().from(messages).where(eq(messages.id, '1')).execute();
      expect(result[0].content).toBe('updated message');
    });

    it('should only update messages belonging to the user', async () => {
      // 创建测试数据
      await serverDB
        .insert(messages)
        .values([{ id: '1', userId: '456', role: 'user', content: 'message 1' }]);

      // 调用 updateMessage 方法
      await messageModel.update('1', { content: 'updated message' });

      // 断言结果
      const result = await serverDB.select().from(messages).where(eq(messages.id, '1')).execute();
      expect(result[0].content).toBe('message 1');
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      // 创建测试数据
      await serverDB
        .insert(messages)
        .values([{ id: '1', userId, role: 'user', content: 'message 1' }]);

      // 调用 deleteMessage 方法
      await messageModel.deleteMessage('1');

      // 断言结果
      const result = await serverDB.select().from(messages).where(eq(messages.id, '1')).execute();
      expect(result).toHaveLength(0);
    });

    it('should delete a message with tool calls', async () => {
      // 创建测试数据
      await serverDB.transaction(async (trx) => {
        await trx.insert(messages).values([
          { id: '1', userId, role: 'user', content: 'message 1', tools: [{ id: 'tool1' }] },
          { id: '2', userId, role: 'tool', content: 'message 1' },
        ]);
        await trx
          .insert(messagePlugins)
          .values([{ id: '2', toolCallId: 'tool1', identifier: 'plugin-1' }]);
      });

      // 调用 deleteMessage 方法
      await messageModel.deleteMessage('1');

      // 断言结果
      const result = await serverDB.select().from(messages).where(eq(messages.id, '1')).execute();
      expect(result).toHaveLength(0);

      const result2 = await serverDB
        .select()
        .from(messagePlugins)
        .where(eq(messagePlugins.id, '2'))
        .execute();

      expect(result2).toHaveLength(0);
    });

    it('should only delete messages belonging to the user', async () => {
      // 创建测试数据
      await serverDB
        .insert(messages)
        .values([{ id: '1', userId: '456', role: 'user', content: 'message 1' }]);

      // 调用 deleteMessage 方法
      await messageModel.deleteMessage('1');

      // 断言结果
      const result = await serverDB.select().from(messages).where(eq(messages.id, '1')).execute();
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteAllMessages', () => {
    it('should delete all messages belonging to the user', async () => {
      // 创建测试数据
      await serverDB.insert(messages).values([
        { id: '1', userId, role: 'user', content: 'message 1' },
        { id: '2', userId, role: 'user', content: 'message 2' },
        { id: '3', userId: '456', role: 'user', content: 'message 3' },
      ]);

      // 调用 deleteAllMessages 方法
      await messageModel.deleteAllMessages();

      // 断言结果
      const result = await serverDB
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .execute();
      expect(result).toHaveLength(0);

      const otherResult = await serverDB
        .select()
        .from(messages)
        .where(eq(messages.userId, '456'))
        .execute();
      expect(otherResult).toHaveLength(1);
    });
  });
});
