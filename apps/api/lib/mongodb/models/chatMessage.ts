import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { ChatMessage as ChatMessageEntity } from '@gatherle/commons/types';

@pre<ChatMessageModel>('validate', function (next) {
  try {
    if (!this.chatMessageId && this._id) {
      this.chatMessageId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class ChatMessageModel extends ChatMessageEntity {}

const ChatMessage = getModelForClass(ChatMessageModel, {
  options: { customName: 'ChatMessage' },
});

export default ChatMessage;
