// We are defining types and submodules, so we can use a namespace
// rather than a module at the top level
// namespace OrderTaking.PlaceOrder

import * as O from 'fp-ts/Option';
import { TaskEither } from 'fp-ts/TaskEither';
import { bound } from '../../libs/decorator';
import { Entity } from '../../libs/model-type';

import type * as Common from '../common-types';
// ==================================
// This file contains the definitions of PUBLIC types (exposed at the boundary of the bounded context)
// related to the PlaceOrder workflow
// ==================================

// ------------------------------------
// inputs to the workflow

export class UnvalidatedCustomerInfo {
  constructor(
    readonly firstName: string,
    readonly lastName: string,
    readonly emailAddress: string,
  ) { }
}

export class UnvalidatedAddress {
  constructor(
    readonly addressLine1: string,
    readonly city: string,
    readonly zipCode: string,
    readonly addressLine2: O.Option<string>,
    readonly addressLine3: O.Option<string>,
    readonly addressLine4: O.Option<string>,
  ) { }
}

export class UnvalidatedOrderLine {
  constructor(
    readonly orderLineId: string,
    readonly productCode: string,
    readonly quantity: number,
  ) { }
}

export class UnvalidatedOrder {
  constructor(
    readonly orderId: string,
    readonly customerInfo: UnvalidatedCustomerInfo,
    readonly shippingAddress: UnvalidatedAddress,
    readonly billingAddress: UnvalidatedAddress,
    readonly lines: UnvalidatedOrderLine[],
  ) { }
}

// ------------------------------------
// outputs from the workflow (success case)

/// Event will be created if the Acknowledgment was successfully posted
export class OrderAcknowledgmentSent {
  constructor(
    readonly orderId: Common.OrderId,
    readonly emailAddress: Common.EmailAddress,
  ) { }
}

// priced state
export class PricedOrderLine extends Entity {
  constructor(
    readonly orderLineId: Common.OrderLineId,
    readonly productCode: Common.ProductCode,
    readonly quantity: Common.OrderQuantity,
    readonly linePrice: Common.Price,
  ) {
    super();
  }

  isSameClass<PricedOrderLine>(obj: unknown): obj is PricedOrderLine {
    return obj instanceof PricedOrderLine;
  }

  @bound
  get id(): Common.OrderLineId {
    return this.orderLineId;
  }
}

export class PricedOrder extends Entity {
  constructor(
    readonly orderId: Common.OrderId,
    readonly customerInfo: Common.CustomerInfo,
    readonly shippingAddress: Common.Address,
    readonly billingAddress: Common.Address,
    readonly amountToBill: Common.BillingAmount,
    readonly lines: readonly PricedOrderLine[],
  ) {
    super();
  }

  isSameClass<PricedOrder>(obj: unknown): obj is PricedOrder {
    return obj instanceof PricedOrder;
  }

  @bound
  get id(): Common.OrderId {
    return this.orderId;
  }
}

/// Event to send to shipping context
export class OrderPlaced {
  constructor(
    readonly orderId: Common.OrderId,
    readonly customerInfo: Common.CustomerInfo,
    readonly shippingAddress: Common.Address,
    readonly billingAddress: Common.Address,
    readonly amountToBill: Common.BillingAmount,
    readonly lines: readonly PricedOrderLine[],
  ) { }
}

/// Event to send to billing context
/// Will only be created if the AmountToBill is not zero
export class BillableOrderPlaced {
  constructor(
    readonly orderId: Common.OrderId,
    readonly billingAddress: Common.Address,
    readonly amountToBill: Common.BillingAmount,
  ) { }
}

/// The possible events resulting from the PlaceOrder workflow
/// Not all events will occur, depending on the logic of the workflow
export type PlaceOrderEvent = OrderPlaced | BillableOrderPlaced | OrderAcknowledgmentSent;

// ------------------------------------
// error outputs

/// All the things that can go wrong in this workflow
declare const validationError: unique symbol;
export class ValidationError extends Error {
  [validationError]: never = undefined as never;
  constructor(message: string) {
    super(message);
  }

  static from(e: Error): ValidationError {
    return new ValidationError(e.message);
  }
}

declare const pricingError: unique symbol;
export class PricingError extends Error {
  [pricingError]: never = undefined as never;
  constructor(message: string) {
    super(message);
  }

  static from(e: Error): PricingError {
    return new PricingError(e.message);
  }
}

export class ServiceInfo {
  constructor(
    readonly name: string,
    readonly endpoint: URL,
  ) { }
}

export class RemoteServiceError {
  constructor(
    readonly service: ServiceInfo,
    readonly exception: Error,
  ) { }
}

export type PlaceOrderError = ValidationError | PricingError | RemoteServiceError;

// ------------------------------------
// the workflow itself

export type PlaceOrder = (i: UnvalidatedOrder) => TaskEither<PlaceOrderError, PlaceOrderEvent[]>;
