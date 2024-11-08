import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { match, P } from 'ts-pattern';
import * as Common from '../common-types';
import { placeOrderEvents } from './implementation.common';
import { ValidationError, PricingError, PricedOrder, PricedOrderLine } from './public-types';
import { ValidatedOrder, ValidatedOrderLine } from './implementation.types';

import type {
  UnvalidatedAddress,
  UnvalidatedOrder,
  UnvalidatedCustomerInfo,
  UnvalidatedOrderLine,
  PlaceOrder,
} from './public-types';
import type {
  CheckedAddress,
  CheckProductCodeExists,
  GetProductPrice,
  CreateOrderAcknowledgmentLetter,
  SendOrderAcknowledgment,
} from './implementation.types';

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

// Product validation

class InvalidFormat {
  constructor(readonly message: string) { }
}
class AddressNotFound {
  constructor(readonly message: string) { }
}

// Address validation
type AddressValidationError = InvalidFormat | AddressNotFound;

export type CheckAddressExists = (i: UnvalidatedAddress) => TE.TaskEither<AddressValidationError, CheckedAddress>;

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

export type PriceOrder = (dep: GetProductPrice) => (i: ValidatedOrder) => E.Either<PricingError, PricedOrder>; // output

// ======================================================
// Section 2 : Implementation
// ======================================================

// ---------------------------
// ValidateOrder step
// ---------------------------

const toCustomerInfo = (
  unvalidatedCustomerInfo: UnvalidatedCustomerInfo,
): E.Either<ValidationError, Common.CustomerInfo> => pipe(
  E.Do,
  E.bind('firstName', () =>
    pipe(unvalidatedCustomerInfo.firstName, Common.String50.create, E.mapLeft(ValidationError.from)),
  ),
  E.bind('lastName', () =>
    pipe(unvalidatedCustomerInfo.lastName, Common.String50.create, E.mapLeft(ValidationError.from)),
  ),
  E.bind('emailAddress', () =>
    pipe(unvalidatedCustomerInfo.emailAddress, Common.EmailAddress.create, E.mapLeft(ValidationError.from)),
  ),
  E.let('name', ({ firstName, lastName }) => new Common.PersonalName(firstName, lastName)),
  E.map(scope => new Common.CustomerInfo(scope.name, scope.emailAddress)),
);

const toAddress = (checkedAddress: CheckedAddress): E.Either<ValidationError, Common.Address> => pipe(
  E.Do,
  E.bind('addressLine1', () =>
    pipe(checkedAddress.addressLine1, Common.String50.create, E.mapLeft(ValidationError.from)),
  ),
  E.bind('addressLine2', () =>
    pipe(checkedAddress.addressLine2, Common.String50.createOption, E.mapLeft(ValidationError.from)),
  ),
  E.bind('addressLine3', () =>
    pipe(checkedAddress.addressLine3, Common.String50.createOption, E.mapLeft(ValidationError.from)),
  ),
  E.bind('addressLine4', () =>
    pipe(checkedAddress.addressLine4, Common.String50.createOption, E.mapLeft(ValidationError.from)),
  ),
  E.bind('city', () => pipe(checkedAddress.city, Common.String50.create, E.mapLeft(ValidationError.from))),
  E.bind('zipCode', () => pipe(checkedAddress.zipCode, Common.ZipCode.create, E.mapLeft(ValidationError.from))),
  E.map(scope => new Common.Address(scope.addressLine1, scope.addressLine2, scope.addressLine3, scope.addressLine4, scope.city, scope.zipCode)),
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

const toOrderId: (orderId: string) => E.Either<ValidationError, Common.OrderId> = flow(
  Common.OrderId.create,
  E.mapLeft(ValidationError.from), // convert creation error into ValidationError
);

/// Helper function for validateOrder
const toOrderLineId: (orderLineId: string) => E.Either<ValidationError, Common.OrderLineId> = flow(
  Common.OrderLineId.create,
  E.mapLeft(ValidationError.from),
);

/// Helper function for validateOrder
const toProductCode = (checkProductCodeExists: CheckProductCodeExists) => {
  // create a ProductCode => Result<ProductCode,...> function
  // suitable for using in a pipeline
  const checkProduct = (productCode: Common.ProductCode) =>
    checkProductCodeExists(productCode)
      ? E.right(productCode)
      : E.left(new ValidationError(`Invalid: ${productCode.value}`));

  // assemble the pipeline
  return flow(
    Common.createProductCode,
    E.mapLeft(ValidationError.from),
    E.flatMap(checkProduct),
  );
};

/// Helper function for validateOrder1
const toOrderQuantity = (productCode: Common.ProductCode) => flow(
  Common.createOrderQuantity(productCode),
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
    Common.BillingAmount.sumPrices, // add them together as a BillingAmount
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
