import 'reflect-metadata';
import { getModelForClass } from '@typegoose/typegoose';
import { ChatConversationUnreadState as ChatConversationUnreadStateEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

class ChatConversationUnreadStateModel extends ChatConversationUnreadStateEntity {}

const ChatConversationUnreadState: MongoModelForClass<typeof ChatConversationUnreadStateModel> = getModelForClass(
  ChatConversationUnreadStateModel,
  {
    options: { customName: 'ChatConversationUnreadState' },
  },
);

export default ChatConversationUnreadState;
