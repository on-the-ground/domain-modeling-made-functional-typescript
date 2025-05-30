import { Option } from 'fp-ts/Option';
import { PhantomBrand, Wrapper } from '../../libs/brand';
import { bound } from '../../libs/decorator';
import { Entity, ValueObject } from '../../libs/model-type';

import type { OrderAcknowledgmentSent, PlaceOrderEvent, PricedOrder, UnvalidatedAddress, PricingError } from './public-types';
import type * as TE from 'fp-ts/TaskEither'
import type * as E from 'fp-ts/Either'
import type { Address, CustomerInfo, EmailAddress, OrderId, OrderLineId, OrderQuantity, Price, ProductCode } from '../common-types';

// ======================================================
// Section 1 : Define each step in the workflow using types
// ======================================================

// ---------------------------
// Validation step
// ---------------------------

// Product validation

export class InvalidFormat {
  constructor(readonly message: string) { }
}
export class AddressNotFound {
  constructor(readonly message: string) { }
}

// Address validation
export type AddressValidationError = InvalidFormat | AddressNotFound;
// Product validation

export type CheckProductCodeExists = (i: ProductCode) => boolean;

// Address validation
declare const checkedAddress: unique symbol;
export type CheckedAddress = PhantomBrand<UnvalidatedAddress, typeof checkedAddress>;
export const createCheckedAddress = (i: UnvalidatedAddress) => i as CheckedAddress;

export type CheckAddressExists = (i: UnvalidatedAddress) => TE.TaskEither<AddressValidationError, CheckedAddress>;

// ---------------------------
// Validated Order
// ---------------------------

export class ValidatedOrderLine extends Entity<OrderLineId> {
  constructor(
    readonly orderLineId: OrderLineId,
    readonly productCode: ProductCode,
    readonly quantity: OrderQuantity,
  ) {
    super();
  }

  isSameClass<ValidatedOrderLine>(obj: unknown): obj is ValidatedOrderLine {
    return obj instanceof ValidatedOrderLine;
  }

  @bound
  get id(): OrderLineId {
    return this.orderLineId;
  }
}

export class ValidatedOrder extends Entity<OrderId> {
  constructor(
    readonly orderId: OrderId,
    readonly customerInfo: CustomerInfo,
    readonly shippingAddress: Address,
    readonly billingAddress: Address,
    readonly lines: readonly ValidatedOrderLine[],
  ) {
    super();
  }

  isSameClass<ValidatedOrder>(obj: unknown): obj is ValidatedOrder {
    return obj instanceof ValidatedOrder;
  }

  @bound
  get id(): OrderId {
    return this.orderId;
  }
}

// ---------------------------
// Pricing step
// ---------------------------

export type GetProductPrice = (i: ProductCode) => Price;

export type PriceOrder = (dep: GetProductPrice) => (i: ValidatedOrder) => E.Either<PricingError, PricedOrder>; // output

// ---------------------------
// Send OrderAcknowledgment
// ---------------------------

declare const htmlString: unique symbol;
export class HtmlString implements Wrapper<string, typeof htmlString> {
  [htmlString]!: never;
  constructor(readonly value: string) { }
}

export class OrderAcknowledgement extends ValueObject {
  constructor(
    readonly emailAddress: EmailAddress,
    readonly letter: HtmlString,
  ) { super() }
}

export type CreateOrderAcknowledgmentLetter = (i: PricedOrder) => HtmlString;

/// Send the order acknowledgement to the customer
/// Note that this does NOT generate an Result-type error (at least not in this workflow)
/// because on failure we will continue anyway.
/// On success, we will generate a OrderAcknowledgmentSent event,
/// but on failure we won't.

export const Sent = 'Sent' as const;
export const NotSent = 'NotSent' as const;
type SendResult = typeof Sent | typeof NotSent;

export type SendOrderAcknowledgment = (i: OrderAcknowledgement) => SendResult;

export type AcknowledgeOrder = (
  dep1: CreateOrderAcknowledgmentLetter,
  dep2: SendOrderAcknowledgment, // dependency
) => (
  i: PricedOrder, // input
) => Option<OrderAcknowledgmentSent>; // output

// ---------------------------
// Create events
// ---------------------------

export type CreateEvents = (
  i1: PricedOrder,
  i2: Option<OrderAcknowledgmentSent>, // input (event from previous step)
) => PlaceOrderEvent[]; // output
