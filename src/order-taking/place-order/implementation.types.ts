import { Option } from 'fp-ts/Option';
import { PhantomBrand } from '../../libs/brand';

import type * as Common from '../common-types';
import type * as Symbol from '../common-types/symbols';
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

export type CheckedAddress = PhantomBrand<UnvalidatedAddress, typeof Symbol.checkedAddress>;
export const CheckedAddress = (i: UnvalidatedAddress) => i as CheckedAddress;

// ---------------------------
// Validated Order
// ---------------------------

export class ValidatedOrderLine {
  constructor(
    readonly orderLineId: Common.OrderLineId,
    readonly productCode: Common.ProductCode,
    readonly quantity: Common.OrderQuantity,
  ) {}
}

export class ValidatedOrder {
  constructor(
    readonly orderId: Common.OrderId,
    readonly customerInfo: Common.CustomerInfo,
    readonly shippingAddress: Common.Address,
    readonly billingAddress: Common.Address,
    readonly lines: readonly ValidatedOrderLine[],
  ) {}
}

// ---------------------------
// Pricing step
// ---------------------------

export type GetProductPrice = (i: Common.ProductCode) => Common.Price;

// ---------------------------
// Send OrderAcknowledgment
// ---------------------------

export type HtmlString = PhantomBrand<string, typeof Symbol.htmlString>;
export const HtmlString = (i: string) => i as HtmlString;

export class OrderAcknowledgment {
  constructor(
    readonly emailAddress: Common.EmailAddress,
    readonly letter: HtmlString,
  ) {}
}

export type CreateOrderAcknowledgmentLetter = (i: PricedOrder) => HtmlString;

/// Send the order acknowledgement to the customer
/// Note that this does NOT generate an Result-type error (at least not in this workflow)
/// because on failure we will continue anyway.
/// On success, we will generate a OrderAcknowledgmentSent event,
/// but on failure we won't.

export const Sent = 'Sent' as const;
export type Sent = typeof Sent;
export const NotSent = 'NotSent' as const;
export type NotSent = typeof NotSent;

type SendResult = Sent | NotSent;

export type SendOrderAcknowledgment = (i: OrderAcknowledgment) => SendResult;

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
