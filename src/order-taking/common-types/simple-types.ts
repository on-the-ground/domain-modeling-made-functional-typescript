import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import * as NA from 'fp-ts/NonEmptyArray';
import * as N from 'fp-ts/number';
import { match, P } from 'ts-pattern';
import { Wrapper } from '../../libs/brand';
import * as ConstrainedType from './constrained-type';
import { ValueObject } from '../../libs/model-type';
import { bound } from '../../libs/decorator';

// ===============================
// Simple types and constrained types related to the OrderTaking domain.
//
// E.g. Single case discriminated unions (aka wrappers), enums, etc
// ===============================

// Constrained to be 50 chars or less, not null
declare const string50: unique symbol;
export class String50 extends ValueObject implements Wrapper<string, typeof string50> {
  [string50]!: never;
  constructor(readonly value: string) {
    super();
  }
  // Create an String50 from a string
  // Return Error if input is null, empty, or length > 50
  static create: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, String50> = ConstrainedType.createString(String50, 50);

  // Create an String50 from a string
  // Return None if input is null, empty.
  // Return error if length > maxLen
  // Return Some if the input is valid
  // static createOption: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, O.Option<String50>> = ConstrainedType.createStringOption(
  //   String50,
  //   50,
  // );
}

// An email address
declare const emailAddress: unique symbol;
export class EmailAddress extends ValueObject implements Wrapper<string, typeof emailAddress> {
  [emailAddress]!: never;
  constructor(readonly value: string) {
    super();
  }

  // Create an EmailAddress from a string
  // Return Error if input is null, empty, or doesn't have an "@" in it
  static create: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, EmailAddress> = ConstrainedType.createLike(EmailAddress, '.+@.+'); // anything separated by an "@"
}

// A zip code
declare const zipCode: unique symbol;
export class ZipCode extends ValueObject implements Wrapper<string, typeof zipCode> {
  [zipCode]!: never;
  constructor(readonly value: string) {
    super();
  }

  // Create a ZipCode from a string
  // Return Error if input is null, empty, or doesn't have 5 digits
  static create: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, ZipCode> = ConstrainedType.createLike(ZipCode, 'd{5}');
}

// An Id for Orders. Constrained to be a non-empty string <= 50 chars
declare const orderId: unique symbol;
export class OrderId extends ValueObject implements Wrapper<string, typeof orderId> {
  [orderId]!: never;
  constructor(readonly value: string) {
    super();
  }

  // Create an OrderId from a string
  // Return Error if input is null, empty, or length > 50
  static create: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, OrderId> = ConstrainedType.createString(OrderId, 50);
}

// An Id for OrderLines. Constrained to be a non-empty string <= 50 chars
declare const orderLineId: unique symbol;
export class OrderLineId extends ValueObject implements Wrapper<string, typeof orderLineId> {
  [orderLineId]!: never;
  constructor(readonly value: string) {
    super();
  }

  // Create an OrderLineId from a string
  // Return Error if input is null, empty, or length > 50
  static create: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, OrderLineId> = ConstrainedType.createString(OrderLineId, 50);
}

// The codes for Widgets start with a "W" and then four digits
declare const widgetCode: unique symbol;
export class WidgetCode extends ValueObject implements Wrapper<string, typeof widgetCode> {
  [widgetCode]!: never;
  constructor(readonly value: string) {
    super();
  }
  // Create an WidgetCode from a string
  // Return Error if input is null. empty, or not matching pattern
  // The codes for Widgets start with a "W" and then four digits
  static create: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, WidgetCode> = ConstrainedType.createLike(WidgetCode, 'Wd{4}');
}

// The codes for Gizmos start with a "G" and then three digits.
declare const gizmoCode: unique symbol;
export class GizmoCode extends ValueObject implements Wrapper<string, typeof gizmoCode> {
  [gizmoCode]!: never;
  constructor(readonly value: string) {
    super();
  }
  // Create an GizmoCode from a string
  // Return Error if input is null, empty, or not matching pattern
  // The codes for Gizmos start with a "G" and then three digits.
  static create: (s: string) => E.Either<ConstrainedType.ErrPrimitiveConstraints, GizmoCode> = ConstrainedType.createLike(GizmoCode, 'Gd{3}');
}

// A ProductCode is either a Widget or a Gizmo
export type ProductCode = WidgetCode | GizmoCode;
// Create an ProductCode from a string
// Return Error if input is null, empty, or not matching pattern
export const createProductCode = flow(
  ConstrainedType.isAlike('W\d{4}|G\d{3}'),
  E.flatMap<string, ConstrainedType.ErrPrimitiveConstraints, ProductCode>(
    code => {
      if (code.startsWith('W')) {
        return WidgetCode.create(code);
      }
      if (code.startsWith('G')) {
        return GizmoCode.create(code);
      }
      throw 'never be here'
    },
  )
)


// Constrained to be a integer between 1 and 1000
declare const unitQuantity: unique symbol;
export class UnitQuantity extends ValueObject implements Wrapper<number, typeof unitQuantity> {
  [unitQuantity]!: never;
  constructor(readonly value: number) {
    super();
  }
  // Create a UnitQuantity from a int
  // Return Error if input is not an integer between 1 and 1000
  static create: (i: number) => E.Either<ConstrainedType.ErrPrimitiveConstraints, UnitQuantity> = ConstrainedType.createNumber(UnitQuantity, 1, 1000);
}

// Constrained to be a decimal between 0.05 and 100.00
declare const kilogramQuantity: unique symbol;
export class KilogramQuantity extends ValueObject implements Wrapper<number, typeof kilogramQuantity> {
  [kilogramQuantity]!: never;
  constructor(readonly value: number) {
    super();
  }
  // Create a KilogramQuantity from a decimal.
  // Return Error if input is not a decimal between 0.05 and 100.00
  static create: (i: number) => E.Either<ConstrainedType.ErrPrimitiveConstraints, KilogramQuantity> = ConstrainedType.createNumber(KilogramQuantity, 0.05, 100);
}

// A Quantity is either a Unit or a Kilogram
export type OrderQuantity = UnitQuantity | KilogramQuantity;

// Create a OrderQuantity from a productCode and quantity
export const createOrderQuantity = (productCode: ProductCode): ((num: number) => E.Either<ConstrainedType.ErrPrimitiveConstraints, OrderQuantity>) =>
  match(productCode)
    .with(P.instanceOf(WidgetCode), () => UnitQuantity.create)
    .with(P.instanceOf(GizmoCode), () => KilogramQuantity.create)
    .exhaustive();

// Constrained to be a decimal between 0.0 and 1000.00
declare const price: unique symbol;
export class Price extends ValueObject implements Wrapper<number, typeof price> {
  [price]!: never;
  constructor(readonly value: number) {
    super();
  }
  // Create a Price from a decimal.
  // Return Error if input is not a decimal between 0.0 and 1000.00
  static create: (i: number) => E.Either<ConstrainedType.ErrPrimitiveConstraints, Price> = ConstrainedType.createNumber(Price, 0, 1000);

  // Create a Price from a decimal.
  // Throw an exception if out of bounds. This should only be used if you know the value is valid.
  static unsafeCreate: (v: number) => Price = flow(
    Price.create,
    E.getOrElseW(err => {
      throw 'Not expecting Price to be out of bounds: ' + err;
    }),
  );

  // Multiply a Price by a decimal qty.
  // Return Error if new price is out of bounds.
  @bound
  multiply(qty: number): E.Either<ConstrainedType.ErrPrimitiveConstraints, Price> {
    return Price.create(qty * this.value);
  }
}

// Constrained to be a decimal between 0.0 and 10000.00
declare const billingAmount: unique symbol;
export class BillingAmount extends ValueObject implements Wrapper<number, typeof billingAmount> {
  [billingAmount]!: never;
  constructor(readonly value: number) {
    super();
  }

  // Create a BillingAmount from a decimal.
  // Return Error if input is not a decimal between 0.0 and 10000.00
  static create: (i: number) => E.Either<ConstrainedType.ErrPrimitiveConstraints, BillingAmount> = ConstrainedType.createNumber(BillingAmount, 0, 10000);

  // Sum a list of prices to make a billing amount
  // Return Error if total is out of bounds
  static sumPrices = (prices: Price[]): E.Either<ConstrainedType.ErrPrimitiveConstraints, BillingAmount> =>
    pipe(
      A.isNonEmpty(prices)
        ? pipe(
          prices,
          NA.map(p => p.value),
          NA.concatAll(N.SemigroupSum),
        )
        : 0,
      BillingAmount.create,
    );
}