import * as E from 'fp-ts/Either';
import { flow } from 'fp-ts/lib/function';

export type ErrPrimitiveConstraints = ErrStringMaxLen | ErrNumberInBetween | ErrStringLike;

type ErrStringMaxLen = ErrEmptyString | ErrStringTooLong
type ErrNumberInBetween = ErrNumberLessThanMin | ErrNumberGreaterThanMax
type ErrStringLike = ErrEmptyString | ErrPatternUnmatched

const ErrEmptyString = {
  name: "ErrEmptyString",
  message: "must not be null or empty",
} as const;
type ErrEmptyString = typeof ErrEmptyString

class ErrStringTooLong extends Error {
  constructor(readonly maxLen: number) {
    super(`must not be more than ${maxLen} chars`)
    this.name = new.target.name
  }
}

class ErrPatternUnmatched extends Error {
  constructor(readonly pattern: string, readonly str: string) {
    super(`'${str}' must match the pattern '${pattern}'`)
    this.name = new.target.name
  }
}

class ErrNumberLessThanMin extends Error {
  constructor(readonly min: number) {
    super(`must not be less than ${min} value`)
    this.name = new.target.name
  }
}

class ErrNumberGreaterThanMax extends Error {
  constructor(readonly max: number) {
    super(`must not be more than ${max} value`)
    this.name = new.target.name
  }
}

// ===============================
// Reusable constructors and getters for constrained types
// ===============================

// Create a constrained string using the constructor provided
// Return Error if input is null, empty, or length > maxLen
export const createString =
  <T>(ctor: { new(i: string): T }, maxLen: number) =>
    (str: string): E.Either<ErrPrimitiveConstraints, T> => {
      if (!str) {
        return E.left(ErrEmptyString);
      }
      if (maxLen < str.length) {
        return E.left(new ErrStringTooLong(maxLen))
      }
      return E.right(new ctor(str));
    };

// Create a optional constrained string using the constructor provided
// Return None if input is null, empty.
// Return error if length > maxLen
// Return Some if the input is valid
// export const createStringOption =
//   <T>(ctor: { new (i: string): T }, maxLen: number) =>
//   (str: string | null = null): E.Either<ErrPrimitiveConstraints, O.Option<T>> => {
//     if (!str) {
//       return E.right(O.none);
//     }
//     if (maxLen < str.length) {
//       return errorFrom(`must not be more than ${maxLen} chars`);
//     }
//     return E.right(O.some(new ctor(str)));
//   };

// Create a constrained number using the constructor provided
// Return Error if input is less than minVal or more than maxVal
export const createNumber =
  <T>(ctor: { new(i: number): T }, min: number, max: number) =>
    (num: number): E.Either<ErrPrimitiveConstraints, T> => {
      if (num < min) {
        return E.left(new ErrNumberLessThanMin(min))
      }
      if (max < num) {
        return E.left(new ErrNumberGreaterThanMax(max))
      }
      return E.right(new ctor(num));
    };

// Create a constrained string using the constructor provided
// Return Error if input is null. empty, or does not match the regex pattern
export const createLike = <T>(ctor: { new(i: string): T }, regex: string) => flow(
  isAlike(regex),
  E.map(i => new ctor(i))
)

export const isAlike = (regex: string) => (str: string): E.Either<ErrPrimitiveConstraints, string> => {
  if (!str) {
    return E.left(ErrEmptyString);
  }
  if (!str.match(regex)) {
    return E.left(new ErrPatternUnmatched(regex, str))
  }
  return E.right(str);
}
