import { Primitives } from 'ts-pattern/dist/types/helpers';

type Brand<S extends symbol> = { [k in S]: never };
export type Wrapper<T extends Primitives, S extends symbol> = Brand<S> & { readonly value: T };
export type PhantomBrand<T, S extends symbol> = Brand<S> & T;
export type Branded<T extends Primitives, S extends symbol> = Wrapper<T, S> | PhantomBrand<T, S>;
