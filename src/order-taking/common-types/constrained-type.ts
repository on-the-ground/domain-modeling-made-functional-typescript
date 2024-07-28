import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { errorFrom } from '../../libs/error';

// ===============================
// Reusable constructors and getters for constrained types
// ===============================

// Create a constrained string using the constructor provided
// Return Error if input is null, empty, or length > maxLen
export const createString =
  <T>(fieldName: string, ctor: { new (i: string): T }, maxLen: number) =>
  (str: string): E.Either<Error, T> => {
    if (!str) {
      return errorFrom(`${fieldName} must not be null or empty`);
    }
    if (maxLen < str.length) {
      return errorFrom(`${fieldName} must not be more than ${maxLen} chars`);
    }
    return E.right(new ctor(str));
  };

// Create a optional constrained string using the constructor provided
// Return None if input is null, empty.
// Return error if length > maxLen
// Return Some if the input is valid
export const createStringOption =
  <T>(fieldName: string, ctor: { new (i: string): T }, maxLen: number) =>
  (str?: string): E.Either<Error, O.Option<T>> => {
    if (!str) {
      return E.right(O.none);
    }
    if (maxLen < str.length) {
      return errorFrom(`${fieldName} must not be more than ${maxLen} chars`);
    }
    return E.right(O.some(new ctor(str)));
  };

// Create a constrained number using the constructor provided
// Return Error if input is less than minVal or more than maxVal
export const createNumber =
  <T>(fieldName: string, ctor: { new (i: number): T }, min: number, max: number) =>
  (num: number): E.Either<Error, T> => {
    if (num < min) {
      return errorFrom(`${fieldName} must not be null or empty`);
    }
    if (max < num) {
      return errorFrom(`${fieldName} must not be more than ${max} chars`);
    }
    return E.right(new ctor(num));
  };

// Create a constrained string using the constructor provided
// Return Error if input is null. empty, or does not match the regex pattern
export const createLike =
  <T>(fieldName: string, ctor: { new (i: string): T }, regex: string) =>
  (str: string): E.Either<Error, T> => {
    if (!str) {
      return errorFrom(`${fieldName} must not be null or empty`);
    }
    if (!str.match(regex)) {
      return errorFrom(`${fieldName}: '${str}' must match the pattern '${regex}'`);
    }
    return E.right(new ctor(str));
  };
