// We are defining types and submodules, so we can use a namespace
// rather than a module at the top level
// namespace OrderTaking.PlaceOrder

import * as O from 'fp-ts/Option';
import { TaskEither } from 'fp-ts/TaskEither';
import { bound } from '../../libs/decorator';
import { Entity, ValueObject } from '../../libs/model-type';

import type {
  Address,
  BillingAmount,
  CustomerInfo,
  EmailAddress,
  OrderId,
  OrderLineId,
  OrderQuantity,
  Price,
  ProductCode,
} from '../common-types';

// ==================================
// This file contains the definitions of PUBLIC types (exposed at the boundary of the bounded context)
// related to the PlaceOrder workflow
// ==================================

// ------------------------------------
// inputs to the workflow

export class UnvalidatedCustomerInfo extends ValueObject {
  constructor(
    readonly firstName: string,
    readonly lastName: string,
    readonly emailAddress: string,
  ) { super() }
}

export class UnvalidatedAddress extends ValueObject {
  constructor(
    readonly addressLine1: string,
    readonly city: string,
    readonly zipCode: string,
    readonly addressLine2: O.Option<string>,
    readonly addressLine3: O.Option<string>,
    readonly addressLine4: O.Option<string>,
  ) { super() }
}

export class UnvalidatedOrderLine extends ValueObject {
  constructor(
    readonly orderLineId: string,
    readonly productCode: string,
    readonly quantity: number,
  ) { super() }
}

export class UnvalidatedOrder extends ValueObject {
  constructor(
    readonly orderId: string,
    readonly customerInfo: UnvalidatedCustomerInfo,
    readonly shippingAddress: UnvalidatedAddress,
    readonly billingAddress: UnvalidatedAddress,
    readonly lines: UnvalidatedOrderLine[],
  ) { super() }
}

// ------------------------------------
// outputs from the workflow (success case)

/// Event will be created if the Acknowledgment was successfully posted
export class OrderAcknowledgmentSent extends ValueObject {
  constructor(
    readonly orderId: OrderId,
    readonly emailAddress: EmailAddress,
  ) { super() }
}

// priced state
export class PricedOrderLine extends Entity<OrderLineId> {
  constructor(
    readonly orderLineId: OrderLineId,
    readonly productCode: ProductCode,
    readonly quantity: OrderQuantity,
    readonly linePrice: Price,
  ) {
    super();
  }

  isSameClass<PricedOrderLine>(obj: unknown): obj is PricedOrderLine {
    return obj instanceof PricedOrderLine;
  }

  @bound
  get id(): OrderLineId {
    return this.orderLineId;
  }
}

export class PricedOrder extends Entity<OrderId> {
  constructor(
    readonly orderId: OrderId,
    readonly customerInfo: CustomerInfo,
    readonly shippingAddress: Address,
    readonly billingAddress: Address,
    readonly amountToBill: BillingAmount,
    readonly lines: readonly PricedOrderLine[],
  ) {
    super();
  }

  isSameClass<PricedOrder>(obj: unknown): obj is PricedOrder {
    return obj instanceof PricedOrder;
  }

  @bound
  get id(): OrderId {
    return this.orderId;
  }
}

/// Event to send to shipping context
export class OrderPlaced extends ValueObject {
  constructor(
    readonly orderId: OrderId,
    readonly customerInfo: CustomerInfo,
    readonly shippingAddress: Address,
    readonly billingAddress: Address,
    readonly amountToBill: BillingAmount,
    readonly lines: readonly PricedOrderLine[],
  ) { super() }
}

/// Event to send to billing context
/// Will only be created if the AmountToBill is not zero
export class BillableOrderPlaced extends ValueObject {
  constructor(
    readonly orderId: OrderId,
    readonly billingAddress: Address,
    readonly amountToBill: BillingAmount,
  ) { super() }
}

/// The possible events resulting from the PlaceOrder workflow
/// Not all events will occur, depending on the logic of the workflow
export type PlaceOrderEvent = OrderPlaced | BillableOrderPlaced | OrderAcknowledgmentSent;

// ------------------------------------
// error outputs

/// All the things that can go wrong in this workflow
declare const validationError: unique symbol;
export class ValidationError extends Error {
  [validationError]!: never;
  constructor(message: string) {
    super(message);
  }

  static from(e: Error): ValidationError {
    return new ValidationError(e.message);
  }
}

declare const pricingError: unique symbol;
export class PricingError extends Error {
  [pricingError]!: never;
  constructor(message: string) {
    super(message);
  }

  static from(e: Error): PricingError {
    return new PricingError(e.message);
  }
}

export class ServiceInfo extends ValueObject {
  constructor(
    readonly name: string,
    readonly endpoint: URL,
  ) { super() }
}

export class RemoteServiceError extends ValueObject {
  constructor(
    readonly service: ServiceInfo,
    readonly exception: Error,
  ) { super() }
}

export type PlaceOrderError = ValidationError | PricingError | RemoteServiceError;

// ------------------------------------
// the workflow itself

export type PlaceOrder = (i: UnvalidatedOrder) => TaskEither<PlaceOrderError, PlaceOrderEvent[]>;
