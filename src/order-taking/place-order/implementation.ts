import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { match, P } from 'ts-pattern';
import { placeOrderEvents } from './implementation.common';
import { AddressNotFound, InvalidFormat, ValidatedOrder, ValidatedOrderLine } from './implementation.types';
import { PricedOrder, PricedOrderLine, PricingError, ValidationError } from './public-types';
import {
  Address,
  BillingAmount,
  createOrderQuantity,
  createProductCode,
  CustomerInfo,
  EmailAddress,
  OrderId,
  OrderLineId,
  PersonalName,
  ProductCode,
  String50,
  ZipCode,
} from '../common-types';

import type {
  CheckAddressExists,
  CheckedAddress,
  CheckProductCodeExists,
  CreateOrderAcknowledgmentLetter,
  GetProductPrice,
  PriceOrder,
  SendOrderAcknowledgment,
} from './implementation.types';
import type {
  PlaceOrder,
  UnvalidatedAddress,
  UnvalidatedCustomerInfo,
  UnvalidatedOrder,
  UnvalidatedOrderLine,
} from './public-types';


// ======================================================
// This file contains the final implementation for the PlaceOrder workflow
//
// This represents the code in chapter 10, "Working with Errors"
//
// There are two parts:
// * the first section contains the (type-only) definitions for each step
// * the second section contains the implementations for each step
//   and the implementation of the overall workflow
// ======================================================

// ======================================================
// Section 1 : Define each step in the workflow using types
// ======================================================

// ---------------------------
// Validation step
// ---------------------------


// ---------------------------
// Validated Order
// ---------------------------

type ValidateOrder = (
  dep1: CheckProductCodeExists,
  dep2: CheckAddressExists, // dependency
) => (
  i: UnvalidatedOrder, // input
) => TE.TaskEither<ValidationError, ValidatedOrder>; // output

// ---------------------------
// Pricing step
// ---------------------------

// priced state is defined Domain.WorkflowTypes

// ======================================================
// Section 2 : Implementation
// ======================================================

// ---------------------------
// ValidateOrder step
// ---------------------------

const toCustomerInfo = (
  unvalidatedCustomerInfo: UnvalidatedCustomerInfo,
): E.Either<ValidationError, CustomerInfo> => pipe(
  E.Do,
  E.bind('firstName', () =>
    pipe(unvalidatedCustomerInfo.firstName, String50.create, E.mapLeft(ValidationError.from)),
  ),
  E.bind('lastName', () =>
    pipe(unvalidatedCustomerInfo.lastName, String50.create, E.mapLeft(ValidationError.from)),
  ),
  E.bind('emailAddress', () =>
    pipe(unvalidatedCustomerInfo.emailAddress, EmailAddress.create, E.mapLeft(ValidationError.from)),
  ),
  E.let('name', ({ firstName, lastName }) => new PersonalName(firstName, lastName)),
  E.map(scope => new CustomerInfo(scope.name, scope.emailAddress)),
);

const optEthToEthOpt: <E, T>(i: O.Option<E.Either<E, T>>) => E.Either<E, O.Option<T>> = O.match(() => E.right(O.none), E.map(O.some));
const toAddress = (checkedAddress: CheckedAddress): E.Either<ValidationError, Address> => pipe(
  E.Do,
  E.bind('addressLine1', () =>
    pipe(checkedAddress.addressLine1, String50.create, E.mapLeft(ValidationError.from)),
  ),
  E.bind('addressLine2', () =>
    pipe(checkedAddress.addressLine2, O.map(flow(String50.create, E.mapLeft(ValidationError.from))), optEthToEthOpt),
  ),
  E.bind('addressLine3', () =>
    pipe(checkedAddress.addressLine3, O.map(flow(String50.create, E.mapLeft(ValidationError.from))), optEthToEthOpt),
  ),
  E.bind('addressLine4', () =>
    pipe(checkedAddress.addressLine4, O.map(flow(String50.create, E.mapLeft(ValidationError.from))), optEthToEthOpt),
  ),
  E.bind('city', () => pipe(checkedAddress.city, String50.create, E.mapLeft(ValidationError.from))),
  E.bind('zipCode', () => pipe(checkedAddress.zipCode, ZipCode.create, E.mapLeft(ValidationError.from))),
  E.map(scope => new Address(scope.addressLine1, scope.addressLine2, scope.addressLine3, scope.addressLine4, scope.city, scope.zipCode)),
);

/// Call the checkAddressExists and convert the error to a ValidationError
const toCheckedAddress = (
  checkAddress: CheckAddressExists,
): ((address: UnvalidatedAddress) => TE.TaskEither<ValidationError, CheckedAddress>) => flow(
  checkAddress,
  TE.mapLeft(addrError =>
    match(addrError)
      .with(P.instanceOf(AddressNotFound), () => new ValidationError('Address not found'))
      .with(P.instanceOf(InvalidFormat), () => new ValidationError('Address has bad format'))
      .exhaustive(),
  ),
);

const toOrderId: (orderId: string) => E.Either<ValidationError, OrderId> = flow(
  OrderId.create,
  E.mapLeft(ValidationError.from), // convert creation error into ValidationError
);

/// Helper function for validateOrder
const toOrderLineId: (orderLineId: string) => E.Either<ValidationError, OrderLineId> = flow(
  OrderLineId.create,
  E.mapLeft(ValidationError.from),
);

/// Helper function for validateOrder
const toProductCode = (checkProductCodeExists: CheckProductCodeExists) => {
  // create a ProductCode => Result<ProductCode,...> function
  // suitable for using in a pipeline
  const checkProduct = (productCode: ProductCode) =>
    checkProductCodeExists(productCode)
      ? E.right(productCode)
      : E.left(new ValidationError(`Invalid: ${productCode.value}`));

  // assemble the pipeline
  return flow(
    createProductCode,
    E.mapLeft(ValidationError.from),
    E.flatMap(checkProduct),
  );
};

/// Helper function for validateOrder1
const toOrderQuantity = (productCode: ProductCode) => flow(
  createOrderQuantity(productCode),
  E.mapLeft(ValidationError.from),
);

/// Helper function for validateOrder
const toValidatedOrderLine = (checkProductCodeExists: CheckProductCodeExists) => ({
  orderLineId,
  productCode,
  quantity,
}: UnvalidatedOrderLine) => pipe(
  E.Do,
  E.bind('validId', () => pipe(orderLineId, toOrderLineId)),
  E.bind('validCode', () => pipe(productCode, toProductCode(checkProductCodeExists))),
  E.bind('validQuantity', ({ validCode }) => pipe(quantity, toOrderQuantity(validCode))),
  E.map(scope => new ValidatedOrderLine(scope.validId, scope.validCode, scope.validQuantity)),
);

const validateOrder: ValidateOrder = (checkProductCodeExists, checkAddressExists) => ({
  orderId,
  customerInfo,
  lines,
  shippingAddress,
  billingAddress,
}: UnvalidatedOrder) => pipe(
  E.Do,
  E.bind('validId', () => toOrderId(orderId)),
  E.bind('validInfo', () => toCustomerInfo(customerInfo)),
  E.bind('validLines', () => pipe(lines, A.map(toValidatedOrderLine(checkProductCodeExists)), E.sequenceArray),),
  TE.fromEither,
  TE.bind('checkedShippingAddress', () => pipe(shippingAddress, toCheckedAddress(checkAddressExists))),
  TE.bind('validShipAdr', ({ checkedShippingAddress }) => pipe(checkedShippingAddress, toAddress, TE.fromEither)),
  TE.bind('checkedBillingAddress', () => pipe(billingAddress, toCheckedAddress(checkAddressExists))),
  TE.bind('validBillingAdr', ({ checkedBillingAddress }) => pipe(checkedBillingAddress, toAddress, TE.fromEither)),
  TE.map(scope => new ValidatedOrder(scope.validId, scope.validInfo, scope.validShipAdr, scope.validBillingAdr, scope.validLines)),
);

// ---------------------------
// PriceOrder step
// ---------------------------

const toPricedOrderLine = (getProductPrice: GetProductPrice) => ({
  orderLineId,
  productCode,
  quantity,
}: ValidatedOrderLine) => pipe(
  E.Do,
  E.bind('linePrice', () => pipe(
    quantity.value,
    getProductPrice(productCode).multiply,
    E.mapLeft(PricingError.from),
  )),
  E.map(({ linePrice }) => new PricedOrderLine(orderLineId, productCode, quantity, linePrice)),
);


const priceOrder: PriceOrder = (getProductPrice) => ({
  lines,
  orderId,
  customerInfo,
  shippingAddress,
  billingAddress,
}: ValidatedOrder) => pipe(
  E.Do,
  E.bind('pricedLines', () => pipe(
    lines,
    A.map(toPricedOrderLine(getProductPrice)),
    E.sequenceArray, // convert list of Results to a single Result
  )),
  E.bind('amountToBill', ({ pricedLines }) => pipe(
    pricedLines,
    A.map(l => l.linePrice), // get each line price
    BillingAmount.sumPrices, // add them together as a BillingAmount
    E.mapLeft(PricingError.from), // convert to PlaceOrderError
  )),
  E.map(scope => new PricedOrder(
    orderId,
    customerInfo,
    shippingAddress,
    billingAddress,
    scope.amountToBill,
    scope.pricedLines,
  )),
);

// ---------------------------
// overall workflow
// ---------------------------

export const placeOrder = (
  checkCode: CheckProductCodeExists, // dependency
  checkAddress: CheckAddressExists, // dependency
  getPrice: GetProductPrice, // dependency
  createAck: CreateOrderAcknowledgmentLetter, // dependency
  sendAck: SendOrderAcknowledgment, // dependency
): PlaceOrder => flow(
  validateOrder(checkCode, checkAddress),
  TE.flatMap(TE.fromEitherK(priceOrder(getPrice))),
  TE.map(placeOrderEvents(createAck, sendAck)),
);
