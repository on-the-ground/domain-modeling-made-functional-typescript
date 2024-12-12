import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

export const errorFrom = (msg: string | null = null): E.Either<Error, never> => pipe(msg, Error, E.left);
