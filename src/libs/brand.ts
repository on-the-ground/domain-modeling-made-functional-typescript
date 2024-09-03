type Brand<S extends symbol> = { [k in S]: never };
export type Wrapper<T, S extends symbol> = Brand<S> & { readonly value: T };
export type PhantomBrand<T, S extends symbol> = Brand<S> & T;
export type Branded<T, S extends symbol> = Wrapper<T, S> | PhantomBrand<T, S>;
