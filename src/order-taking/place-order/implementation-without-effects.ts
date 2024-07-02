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
const failOnError: <T>(aResult: E.Either<string, T>) => T = E.getOrElse((e) => {
  throw e;
});

namespace String50 {
  export const create = (fieldName: string) => flow(Common.String50.create(fieldName), failOnError);
  export const createOption = (fieldName: string) => flow(Common.String50.createOption(fieldName), failOnError);
}

namespace EmailAddress {
  export const create = (fieldName: string) => flow(Common.EmailAddress.create(fieldName), failOnError);
}

namespace ZipCode {
  export const create = (fieldName: string) => flow(Common.ZipCode.create(fieldName), failOnError);
}

namespace OrderId {
  export const create = (fieldName: string) => flow(Common.OrderId.create(fieldName), failOnError);
}

namespace OrderLineId {
  export const create = (fieldName: string) => flow(Common.OrderLineId.create(fieldName), failOnError);
}

namespace WidgetCode {
  export const create = (fieldName: string) => flow(Common.WidgetCode.create(fieldName), failOnError);
}

namespace GizmoCode {
  export const create = (fieldName: string) => flow(Common.GizmoCode.create(fieldName), failOnError);
}

namespace ProductCode {
  export const create = (fieldName: string) => flow(Common.createProductCode(fieldName), failOnError);
}

namespace UnitQuantity {
  export const create = (fieldName: string) => flow(Common.UnitQuantity.create(fieldName), failOnError);
}

namespace KilogramQuantity {
  export const create = (fieldName: string) => flow(Common.KilogramQuantity.create(fieldName), failOnError);
}

namespace OrderQuantity {
  export const create = (fieldName: string, productCode: Common.ProductCode) =>
    flow(Common.createOrderQuantity(fieldName, productCode), failOnError);
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
  const firstName = String50.create('FirstName')(unvalidatedCustomerInfo.FirstName);
  const lastName = String50.create('LastName')(unvalidatedCustomerInfo.LastName);
  const emailAddress = EmailAddress.create('EmailAddress')(unvalidatedCustomerInfo.EmailAddress);
  return new Common.CustomerInfo(new Common.PersonalName(firstName, lastName), emailAddress);
};

const toAddress = (checkAddressExists: CheckAddressExists) => (unvalidatedAddress: UnvalidatedAddress) => {
  // call the remote service
  const checkedAddress = checkAddressExists(unvalidatedAddress);
  const addressLine1 = String50.create('AddressLine1')(checkedAddress.AddressLine1);
  const addressLine2 = String50.createOption('AddressLine2')(checkedAddress.AddressLine2);
  const addressLine3 = String50.createOption('AddressLine3')(checkedAddress.AddressLine3);
  const addressLine4 = String50.createOption('AddressLine4')(checkedAddress.AddressLine4);
  const city = String50.create('City')(checkedAddress.City);
  const zipCode = ZipCode.create('ZipCode')(checkedAddress.ZipCode);
  return new Common.Address(addressLine1, addressLine2, addressLine3, addressLine4, city, zipCode);
};

/// Function adapter to convert a predicate to a passthru
const predicateToPassthru =
  <T>(errorMsg: string, f: (i: T) => boolean) =>
  (x: T): T => {
    if (f(x)) {
      return x;
    } else {
      throw Error(errorMsg);
    }
  };

/// Helper function for validateOrder
const toProductCode = (checkProductCodeExists: CheckProductCodeExists) => (productCode: string) => {
  // create a ProductCode => ProductCode function
  // suitable for using in a pipeline
  const checkProduct = predicateToPassthru(`Invalid: ${productCode}`, checkProductCodeExists);
  // assemble the pipeline
  return pipe(productCode, ProductCode.create('ProduceCode'), checkProduct);
};

/// Helper function for validateOrder
const toValidatedOrderLine =
  (checkProductExists: CheckProductCodeExists) => (unvalidatedOrderLine: UnvalidatedOrderLine) => {
    const orderLineId = OrderLineId.create('OrderLineId')(unvalidatedOrderLine.OrderLineId);
    const productCode = toProductCode(checkProductExists)(unvalidatedOrderLine.ProductCode);
    const quantity = OrderQuantity.create('OrderQuantity', productCode)(unvalidatedOrderLine.Quantity);
    return new ValidatedOrderLine(orderLineId, productCode, quantity);
  };

const validateOrder: ValidateOrder = (checkProductCodeExists, checkAddressExists) => (unvalidatedOrder) => {
  const orderId = OrderId.create('OrderId')(unvalidatedOrder.OrderId);
  const customerInfo = toCustomerInfo(unvalidatedOrder.CustomerInfo);
  const shippingAddress = toAddress(checkAddressExists)(unvalidatedOrder.ShippingAddress);
  const billingAddress = toAddress(checkAddressExists)(unvalidatedOrder.BillingAddress);
  const lines = pipe(unvalidatedOrder.Lines, A.map(toValidatedOrderLine(checkProductCodeExists)));
  return new ValidatedOrder(orderId, customerInfo, shippingAddress, billingAddress, lines);
};

// ---------------------------
// PriceOrder step
// ---------------------------

const toPricedOrderLine = (getProductPrice: GetProductPrice) => (validatedOrderLine: ValidatedOrderLine) => {
  const qty = validatedOrderLine.Quantity.value;
  const price = getProductPrice(validatedOrderLine.ProductCode);
  const linePrice = Price.multiply(price)(qty);
  return new PricedOrderLine(
    validatedOrderLine.OrderLineId,
    validatedOrderLine.ProductCode,
    validatedOrderLine.Quantity,
    linePrice,
  );
};

const priceOrder: PriceOrder = (getProductPrice) => (validatedOrder) => {
  const lines = pipe(validatedOrder.Lines, A.map(toPricedOrderLine(getProductPrice)));
  const amountToBill = pipe(
    lines,
    A.map((l) => l.LinePrice), // get each line price
    BillingAmount.sumPrices, // add them together as a BillingAmount
  );
  return new PricedOrder(
    validatedOrder.OrderId,
    validatedOrder.CustomerInfo,
    validatedOrder.ShippingAddress,
    validatedOrder.BillingAddress,
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
): PlaceOrderWithoutEffects => // definition of function
  flow(validateOrder(checkCode, checkAddress), priceOrder(getPrice), placeOrderEvents(createAck, sendAck));
