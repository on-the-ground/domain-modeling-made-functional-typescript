type Brand<S extends symbol> = { [k in S]: never };
export type WrappedClass<T, S extends symbol> = Brand<S> & { readonly value: T };
export type PhantomBrand<T, S extends symbol> = Brand<S> & T;
export type Branded<T, S extends symbol> = WrappedClass<T, S> | PhantomBrand<T, S>;
