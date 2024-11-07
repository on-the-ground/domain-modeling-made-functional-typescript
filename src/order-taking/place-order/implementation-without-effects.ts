import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import * as Common from '../common-types';
import { placeOrderEvents } from './implementation.common';
import { PricedOrder, PricedOrderLine } from './public-types';
import { ValidatedOrder, ValidatedOrderLine } from './implementation.types';

import type {
  PlaceOrderEvent,
  UnvalidatedAddress,
  UnvalidatedCustomerInfo,
  UnvalidatedOrder,
  UnvalidatedOrderLine,
} from './public-types';
import type {
  CheckedAddress,
  CheckProductCodeExists,
  GetProductPrice,
  CreateOrderAcknowledgmentLetter,
  SendOrderAcknowledgment,
} from './implementation.types';

// ======================================================
// This file contains the implementation for the PlaceOrder workflow
// WITHOUT any effects like Result or Async
//
// This represents the code in chapter 9, "Composing a Pipeline"
//
// There are two parts:
// * the first section contains the (type-only) definitions for each step
// * the second section contains the implementations for each step
//   and the implementation of the overall workflow
// ======================================================

// ------------------------------------
// the workflow itself, without effects

type PlaceOrderWithoutEffects = (i: UnvalidatedOrder) => PlaceOrderEvent[];

// ======================================================
// Override the Simpconstype constructors
// so that they raise exceptions rather than return Results
// ======================================================

// helper to convert Results into exceptions so we can reuse the smart constructors in Simpconstypes.
const failOnError: <T>(aResult: E.Either<Error, T>) => T = E.getOrElse((e) => {
  throw e;
});

namespace String50 {
  export const create = flow(Common.String50.create, failOnError);
  export const createOption = flow(Common.String50.createOption, failOnError);
}

namespace EmailAddress {
  export const create = flow(Common.EmailAddress.create, failOnError);
}

namespace ZipCode {
  export const create = flow(Common.ZipCode.create, failOnError);
}

namespace OrderId {
  export const create = flow(Common.OrderId.create, failOnError);
}

namespace OrderLineId {
  export const create = flow(Common.OrderLineId.create, failOnError);
}

namespace WidgetCode {
  export const create = flow(Common.WidgetCode.create, failOnError);
}

namespace GizmoCode {
  export const create = flow(Common.GizmoCode.create, failOnError);
}

namespace ProductCode {
  export const create = flow(Common.createProductCode, failOnError);
}

namespace UnitQuantity {
  export const create = flow(Common.UnitQuantity.create, failOnError);
}

namespace KilogramQuantity {
  export const create = flow(Common.KilogramQuantity.create, failOnError);
}

namespace OrderQuantity {
  export const create = (productCode: Common.ProductCode) => flow(Common.createOrderQuantity(productCode), failOnError);
}

namespace Price {
  export const create = flow(Common.Price.create, failOnError);
  export const multiply = (p: Common.Price) => flow(p.multiply, failOnError);
}

namespace BillingAmount {
  export const create = flow(Common.BillingAmount.create, failOnError);
  export const sumPrices = flow(Common.BillingAmount.sumPrices, failOnError);
}

// ======================================================
// Section 1 : Define each step in the workflow using types
// ======================================================

// ---------------------------
// Validation step
// ---------------------------

// Product validation

// Address validation exception
const AddressValidationFailure = Error('AddressValidationFailure');

type CheckAddressExists = (i: UnvalidatedAddress) => CheckedAddress;

// ---------------------------
// Validated Order
// ---------------------------

type ValidateOrder = (
  dep1: CheckProductCodeExists,
  dep2: CheckAddressExists, // dependency
) => (
  i: UnvalidatedOrder, // input
) => ValidatedOrder; // output

// ---------------------------
// Pricing step
// ---------------------------

// priced state is defined Domain.WorkflowTypes

type PriceOrder = (
  dep: GetProductPrice, // dependency
) => (
  i: ValidatedOrder, // input
) => PricedOrder; // output

// ======================================================
// Section 2 : Implementation
// ======================================================

// ---------------------------
// ValidateOrder step
// ---------------------------

const toCustomerInfo = (unvalidatedCustomerInfo: UnvalidatedCustomerInfo) => {
  const firstName = String50.create(unvalidatedCustomerInfo.firstName);
  const lastName = String50.create(unvalidatedCustomerInfo.lastName);
  const emailAddress = EmailAddress.create(unvalidatedCustomerInfo.emailAddress);
  return new Common.CustomerInfo(new Common.PersonalName(firstName, lastName), emailAddress);
};

const toAddress = (checkAddressExists: CheckAddressExists) => (unvalidatedAddress: UnvalidatedAddress) => {
  // call the remote service
  const checkedAddress = checkAddressExists(unvalidatedAddress);
  const addressLine1 = String50.create(checkedAddress.addressLine1);
  const addressLine2 = String50.createOption(checkedAddress.addressLine2);
  const addressLine3 = String50.createOption(checkedAddress.addressLine3);
  const addressLine4 = String50.createOption(checkedAddress.addressLine4);
  const city = String50.create(checkedAddress.city);
  const zipCode = ZipCode.create(checkedAddress.zipCode);
  return new Common.Address(addressLine1, addressLine2, addressLine3, addressLine4, city, zipCode);
};

/// Function adapter to convert a predicate to a passthru
const predicateToPassthru =
  <T>(errMsg: string, f: (i: T) => boolean) =>
    (x: T): T => {
      if (f(x)) {
        return x;
      } else {
        throw Error(errMsg);
      }
    };

/// Helper function for validateOrder
const toProductCode = (checkProductCodeExists: CheckProductCodeExists) => (productCode: string) => {
  // create a ProductCode => ProductCode function
  // suitable for using in a pipeline
  const checkProduct = predicateToPassthru(`Invalid: ${productCode}`, checkProductCodeExists);
  // assemble the pipeline
  return pipe(productCode, ProductCode.create, checkProduct);
};

/// Helper function for validateOrder
const toValidatedOrderLine =
  (checkProductExists: CheckProductCodeExists) => (unvalidatedOrderLine: UnvalidatedOrderLine) => {
    const orderLineId = OrderLineId.create(unvalidatedOrderLine.orderLineId);
    const productCode = toProductCode(checkProductExists)(unvalidatedOrderLine.productCode);
    const quantity = OrderQuantity.create(productCode)(unvalidatedOrderLine.quantity);
    return new ValidatedOrderLine(orderLineId, productCode, quantity);
  };

const validateOrder: ValidateOrder = (checkProductCodeExists, checkAddressExists) => unvalidatedOrder => {
  const orderId = OrderId.create(unvalidatedOrder.orderId);
  const customerInfo = toCustomerInfo(unvalidatedOrder.customerInfo);
  const shippingAddress = toAddress(checkAddressExists)(unvalidatedOrder.shippingAddress);
  const billingAddress = toAddress(checkAddressExists)(unvalidatedOrder.billingAddress);
  const lines = pipe(unvalidatedOrder.lines, A.map(toValidatedOrderLine(checkProductCodeExists)));
  return new ValidatedOrder(orderId, customerInfo, shippingAddress, billingAddress, lines);
};

// ---------------------------
// PriceOrder step
// ---------------------------

const toPricedOrderLine = (getProductPrice: GetProductPrice) => (validatedOrderLine: ValidatedOrderLine) => {
  const qty = validatedOrderLine.quantity.value;
  const price = getProductPrice(validatedOrderLine.productCode);
  const linePrice = Price.multiply(price)(qty);
  return new PricedOrderLine(
    validatedOrderLine.orderLineId,
    validatedOrderLine.productCode,
    validatedOrderLine.quantity,
    linePrice,
  );
};

const priceOrder: PriceOrder = getProductPrice => validatedOrder => {
  const lines = pipe(validatedOrder.lines, A.map(toPricedOrderLine(getProductPrice)));
  const amountToBill = pipe(
    lines,
    A.map(l => l.linePrice), // get each line price
    BillingAmount.sumPrices, // add them together as a BillingAmount
  );
  return new PricedOrder(
    validatedOrder.orderId,
    validatedOrder.customerInfo,
    validatedOrder.shippingAddress,
    validatedOrder.billingAddress,
    amountToBill,
    lines,
  );
};

// ---------------------------
// overall workflow
// ---------------------------

const placeOrder = (
  checkCode: CheckProductCodeExists, // dependency
  checkAddress: CheckAddressExists, // dependency
  getPrice: GetProductPrice, // dependency
  createAck: CreateOrderAcknowledgmentLetter, // dependency
  sendAck: SendOrderAcknowledgment, // dependency
): PlaceOrderWithoutEffects => flow(
  validateOrder(checkCode, checkAddress),
  priceOrder(getPrice),
  placeOrderEvents(createAck, sendAck),
);
