import { match, P } from 'ts-pattern';
import { deepStrictEqual } from 'assert';

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
const RawIdPattern = P.union(P.string, P.number, P.bigint);
type WrapperId = ValueObject;
const WrapperIdPattern = P.instanceOf(ValueObject);

export abstract class Entity implements Equatable {
  abstract readonly id: RawId | WrapperId;
  abstract isSameClass<T extends Entity>(obj: unknown): obj is T;

  equals(obj: unknown): boolean {
    return this.isSameClass(obj)
      ? match(this.id)
        .with(RawIdPattern, id => id === obj.id)
        .with(WrapperIdPattern, id => id.equals(obj.id))
        .exhaustive()
      : false;
  }
}
