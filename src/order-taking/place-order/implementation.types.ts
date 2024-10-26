import { Option } from 'fp-ts/Option';
import { PhantomBrand, Wrapper } from '../../libs/brand';
import { Entity } from '../../libs/model-type';

import type * as Common from '../common-types';
import type { UnvalidatedAddress, PricedOrder, OrderAcknowledgmentSent, PlaceOrderEvent } from './public-types';

// ======================================================
// Section 1 : Define each step in the workflow using types
// ======================================================

// ---------------------------
// Validation step
// ---------------------------

// Product validation

export type CheckProductCodeExists = (i: Common.ProductCode) => boolean;

// Address validation
declare const checkedAddress: unique symbol;
export type CheckedAddress = PhantomBrand<UnvalidatedAddress, typeof checkedAddress>;
export const CheckedAddress = (i: UnvalidatedAddress) => i as CheckedAddress;

// ---------------------------
// Validated Order
// ---------------------------

export class ValidatedOrderLine extends Entity {
  constructor(
    readonly orderLineId: Common.OrderLineId,
    readonly productCode: Common.ProductCode,
    readonly quantity: Common.OrderQuantity,
  ) {
    super();
  }

  isSameClass<ValidatedOrderLine>(obj: unknown): obj is ValidatedOrderLine {
    return obj instanceof ValidatedOrderLine;
  }

  get id(): Common.OrderLineId {
    return this.orderLineId;
  }
}

export class ValidatedOrder extends Entity {
  constructor(
    readonly orderId: Common.OrderId,
    readonly customerInfo: Common.CustomerInfo,
    readonly shippingAddress: Common.Address,
    readonly billingAddress: Common.Address,
    readonly lines: readonly ValidatedOrderLine[],
  ) {
    super();
  }

  isSameClass<ValidatedOrder>(obj: unknown): obj is ValidatedOrder {
    return obj instanceof ValidatedOrder;
  }

  get id(): Common.OrderId {
    return this.orderId;
  }
}

// ---------------------------
// Pricing step
// ---------------------------

export type GetProductPrice = (i: Common.ProductCode) => Common.Price;

// ---------------------------
// Send OrderAcknowledgment
// ---------------------------

declare const htmlString: unique symbol;
export class HtmlString implements Wrapper<string, typeof htmlString> {
  [htmlString]: never;
  constructor(readonly value: string) { }
}

export class OrderAcknowledgement {
  constructor(
    readonly emailAddress: Common.EmailAddress,
    readonly letter: HtmlString,
  ) { }
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
