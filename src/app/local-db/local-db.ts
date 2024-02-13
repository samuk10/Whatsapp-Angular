import Dexie, { liveQuery } from 'dexie';
import { defer, from, map } from 'rxjs';
import { LocalConversationMessage } from './local-conversation-message.model';
import { LocalConversation } from './local-conversation.model';
import { LocalUserImage } from './local-user-image.model';

export class LocalDb {
  private localDb = new Dexie('whats-local-live');

  private get userTable() {
    return this.localDb.table<LocalUserImage>('users');
  }

  private get conversationTable() {
    return this.localDb.table<LocalConversation>('conversations');
  }

  private get conversationMessagesTable() {
    return this.localDb.table<LocalConversationMessage>('conversationMessages');
  }

  constructor() {
    this.localDb.version(4).stores({
      users: '&id, name, imageBlob',
      conversations: '&id, userName',
      conversationMessages: '++id, conversationUserId, message, mine, time',
    });
  }

  addUsers(users: LocalUserImage[]) {
    return from(this.userTable.bulkPut(users));
  }

  getUserImage(userId: string) {
    return from(this.userTable.get(userId)).pipe(
      map(localUserImageBlob => localUserImageBlob?.imageBlob)
    );
  }

  addConversation(id: string, userName: string) {
    return defer(() => this.conversationTable.put({ id, userName }));
  }

  getUsers() {
    return defer(() => this.userTable.toArray());
  }

  getLiveConversations() {
    return from(liveQuery(() => this.conversationTable.toArray()));
  }

  getUserById(userId: string) {
    return defer(() => this.userTable.get(userId.toLowerCase()));
  }

  getMessagesHistoryByConversationUserId(conversationUserId: string) {
    return defer(() =>
      this.conversationMessagesTable
        .where('conversationUserId')
        .equalsIgnoreCase(conversationUserId)
        .toArray()
    );
  }

  saveMessage(message: LocalConversationMessage) {
    return from(this.conversationMessagesTable.add(message));
  }
}
