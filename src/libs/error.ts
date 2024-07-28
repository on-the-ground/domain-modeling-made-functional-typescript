import * as E from 'fp-ts/Either';
import { flow } from 'fp-ts/function';

export const errorFrom: (msg?: string) => E.Either<Error, never> = flow(Error, E.left);
