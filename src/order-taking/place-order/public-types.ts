// We are defining types and submodules, so we can use a namespace
// rather than a module at the top level
// namespace OrderTaking.PlaceOrder

import { TaskEither } from 'fp-ts/TaskEither';
import * as Symbol from '../common-types/symbols';

import type * as Common from '../common-types';
// ==================================
// This file contains the definitions of PUBLIC types (exposed at the boundary of the bounded context)
// related to the PlaceOrder workflow
// ==================================

// ------------------------------------
// inputs to the workflow

export class UnvalidatedCustomerInfo {
  constructor(
    readonly FirstName: string,
    readonly LastName: string,
    readonly EmailAddress: string,
  ) {}
}

export class UnvalidatedAddress {
  constructor(
    readonly AddressLine1: string,
    readonly AddressLine2: string,
    readonly AddressLine3: string,
    readonly AddressLine4: string,
    readonly City: string,
    readonly ZipCode: string,
  ) {}
}

export class UnvalidatedOrderLine {
  constructor(
    readonly OrderLineId: string,
    readonly ProductCode: string,
    readonly Quantity: number,
  ) {}
}

export class UnvalidatedOrder {
  constructor(
    readonly OrderId: string,
    readonly CustomerInfo: UnvalidatedCustomerInfo,
    readonly ShippingAddress: UnvalidatedAddress,
    readonly BillingAddress: UnvalidatedAddress,
    readonly Lines: UnvalidatedOrderLine[],
  ) {}
}

// ------------------------------------
// outputs from the workflow (success case)

/// Event will be created if the Acknowledgment was successfully posted
export class OrderAcknowledgmentSent {
  constructor(
    readonly OrderId: Common.OrderId,
    readonly EmailAddress: Common.EmailAddress,
  ) {}
}

// priced state
export class PricedOrderLine {
  constructor(
    readonly OrderLineId: Common.OrderLineId,
    readonly ProductCode: Common.ProductCode,
    readonly Quantity: Common.OrderQuantity,
    readonly LinePrice: Common.Price,
  ) {}
}

export class PricedOrder {
  constructor(
    readonly OrderId: Common.OrderId,
    readonly CustomerInfo: Common.CustomerInfo,
    readonly ShippingAddress: Common.Address,
    readonly BillingAddress: Common.Address,
    readonly AmountToBill: Common.BillingAmount,
    readonly Lines: readonly PricedOrderLine[],
  ) {}
}

/// Event to send to shipping context
export class OrderPlaced {
  constructor(
    readonly OrderId: Common.OrderId,
    readonly CustomerInfo: Common.CustomerInfo,
    readonly ShippingAddress: Common.Address,
    readonly BillingAddress: Common.Address,
    readonly AmountToBill: Common.BillingAmount,
    readonly Lines: readonly PricedOrderLine[],
  ) {}
}

/// Event to send to billing context
/// Will only be created if the AmountToBill is not zero
export class BillableOrderPlaced {
  constructor(
    readonly OrderId: Common.OrderId,
    readonly BillingAddress: Common.Address,
    readonly AmountToBill: Common.BillingAmount,
  ) {}
}

/// The possible events resulting from the PlaceOrder workflow
/// Not all events will occur, depending on the logic of the workflow
export type PlaceOrderEvent = OrderPlaced | BillableOrderPlaced | OrderAcknowledgmentSent;

// ------------------------------------
// error outputs

/// All the things that can go wrong in this workflow
export class ValidationError {
  readonly [Symbol.validationError]: never;
  constructor(readonly msg: string) {}
}

export class PricingError {
  readonly [Symbol.pricingError]: never;
  constructor(readonly msg: string) {}
}

export class ServiceInfo {
  constructor(
    readonly Name: string,
    readonly Endpoint: URL,
  ) {}
}

export class RemoteServiceError {
  constructor(
    readonly Service: ServiceInfo,
    readonly Exception: Error,
  ) {}
}

export type PlaceOrderError = ValidationError | PricingError | RemoteServiceError;

// ------------------------------------
// the workflow itself

export type PlaceOrder = (i: UnvalidatedOrder) => TaskEither<PlaceOrderError, PlaceOrderEvent[]>;
