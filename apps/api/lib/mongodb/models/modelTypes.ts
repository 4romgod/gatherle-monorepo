import type { ReturnModelType } from '@typegoose/typegoose';

type AnyModelClass<T = unknown> = new (...args: unknown[]) => T;

export type MongoModelForClass<T extends AnyModelClass> = ReturnModelType<T, Record<string, never>>;
