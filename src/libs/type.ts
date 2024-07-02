export type PartialKeys<T> = {
  [P in keyof T]-?: Pick<T, P> extends Required<Pick<T, P>> ? never : P;
}[keyof T];

export type RequiredKeys<T> = Exclude<keyof T, PartialKeys<T>>;

export type DataPropertyKeys<T> = {
  [P in keyof T]-?: T[P] extends (...args: any) => any ? never : P;
}[keyof T];

export type RequiredDataPropertyKeys<T> = Extract<DataPropertyKeys<T>, RequiredKeys<T>>;
export type PartialDataPropertyKeys<T> = Exclude<DataPropertyKeys<T>, RequiredKeys<T>>;
export type DataProperties<T> = { [K in RequiredDataPropertyKeys<T>]: T[K] } & {
  [K in PartialDataPropertyKeys<T>]?: T[K];
};
