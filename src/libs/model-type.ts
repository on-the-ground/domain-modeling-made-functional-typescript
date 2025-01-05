import { deepStrictEqual } from 'assert';
import { bound } from '../libs/decorator';

interface Equatable {
  equals(obj: unknown): boolean;
}

export abstract class ValueObject implements Equatable {
  equals(obj: unknown): boolean {
    try {
      deepStrictEqual(this, obj);
      return true;
    } catch {
      return false;
    }
  }
}

type RawId = string | number | bigint;

export abstract class Entity implements Equatable {
  abstract readonly id: RawId | ValueObject;
  protected abstract isSameClass<T extends Entity>(obj: unknown): obj is T;

  @bound
  equals(obj: unknown): boolean {
    if (!this.isSameClass(obj)) return false;
    return (this.id instanceof ValueObject)
      ? this.id.equals(obj.id)
      : this.id === obj.id;
  }
}
