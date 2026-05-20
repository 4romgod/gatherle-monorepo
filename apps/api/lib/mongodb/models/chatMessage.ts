import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { ChatMessage as ChatMessageEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<ChatMessageModel>('validate', function () {
  if (!this.chatMessageId && this._id) {
    this.chatMessageId = this._id.toString();
  }
})
class ChatMessageModel extends ChatMessageEntity {}

const ChatMessage: MongoModelForClass<typeof ChatMessageModel> = getModelForClass(ChatMessageModel, {
  options: { customName: 'ChatMessage' },
});

export default ChatMessage;
