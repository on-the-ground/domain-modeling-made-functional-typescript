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
  PlaceOrderError,
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
  constructor(readonly message: string) {}
}
class AddressNotFound {
  constructor(readonly message: string) {}
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
): E.Either<ValidationError, Common.CustomerInfo> =>
  pipe(
    E.Do,
    E.bind('firstName', () =>
      pipe(
        unvalidatedCustomerInfo.firstName,
        Common.String50.create('firstName'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('lastName', () =>
      pipe(
        unvalidatedCustomerInfo.lastName,
        Common.String50.create('lastName'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('emailAddress', () =>
      pipe(
        unvalidatedCustomerInfo.emailAddress,
        Common.EmailAddress.create('emailAddress'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('name', ({ firstName, lastName }) => E.right(new Common.PersonalName(firstName, lastName))),
    E.map(({ name, emailAddress }) => new Common.CustomerInfo(name, emailAddress)),
  );

const toAddress = (checkedAddress: CheckedAddress): E.Either<ValidationError, Common.Address> =>
  pipe(
    E.Do,
    E.bind('addressLine1', () =>
      pipe(
        checkedAddress.addressLine1,
        Common.String50.create('addressLine1'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('addressLine2', () =>
      pipe(
        checkedAddress.addressLine2,
        Common.String50.createOption('addressLine2'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('addressLine3', () =>
      pipe(
        checkedAddress.addressLine3,
        Common.String50.createOption('addressLine3'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('addressLine4', () =>
      pipe(
        checkedAddress.addressLine4,
        Common.String50.createOption('addressLine4'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('city', () =>
      pipe(
        checkedAddress.city,
        Common.String50.create('city'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.bind('zipCode', () =>
      pipe(
        checkedAddress.zipCode,
        Common.ZipCode.create('zipCode'),
        E.mapLeft((e) => new ValidationError(e)),
      ),
    ),
    E.map((i) => new Common.Address(i.addressLine1, i.addressLine2, i.addressLine3, i.addressLine4, i.city, i.zipCode)),
  );

/// Call the checkAddressExists and convert the error to a ValidationError
const toCheckedAddress = (
  checkAddress: CheckAddressExists,
): ((address: UnvalidatedAddress) => TE.TaskEither<ValidationError, CheckedAddress>) =>
  flow(
    checkAddress,
    TE.mapLeft((addrError) =>
      match(addrError)
        .with(P.instanceOf(AddressNotFound), () => new ValidationError('Address not found'))
        .with(P.instanceOf(InvalidFormat), () => new ValidationError('Address has bad format'))
        .exhaustive(),
    ),
  );

const toOrderId: (orderId: string) => E.Either<ValidationError, Common.OrderId> = flow(
  Common.OrderId.create('orderId'),
  E.mapLeft((e) => new ValidationError(e)), // convert creation error into ValidationError
);

/// Helper function for validateOrder
const toOrderLineId: (orderLineId: string) => E.Either<ValidationError, Common.OrderLineId> = flow(
  Common.OrderLineId.create('orderLineId'),
  E.mapLeft((e) => new ValidationError(e)),
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
    Common.createProductCode('productCode'),
    E.mapLeft((e) => new ValidationError(e)),
    E.flatMap(checkProduct),
  );
};

/// Helper function for validateOrder1
const toOrderQuantity = (productCode: Common.ProductCode) =>
  flow(
    Common.createOrderQuantity('orderQuantity', productCode),
    E.mapLeft((e) => new ValidationError(e)),
  );

/// Helper function for validateOrder
const toValidatedOrderLine =
  (checkProductCodeExists: CheckProductCodeExists) => (unvalidatedOrderLine: UnvalidatedOrderLine) =>
    pipe(
      E.Do,
      E.bind('orderLineId', () => toOrderLineId(unvalidatedOrderLine.orderLineId)),
      E.bind('productCode', () => toProductCode(checkProductCodeExists)(unvalidatedOrderLine.productCode)),
      E.bind('quantity', ({ productCode }) => toOrderQuantity(productCode)(unvalidatedOrderLine.quantity)),
      E.map((i) => new ValidatedOrderLine(i.orderLineId, i.productCode, i.quantity)),
    );

const validateOrder: ValidateOrder = (checkProductCodeExists, checkAddressExists) => (unvalidated) =>
  pipe(
    E.Do,
    E.bind('orderId', () => toOrderId(unvalidated.orderId)),
    E.bind('customerInfo', () => toCustomerInfo(unvalidated.customerInfo)),
    E.bind('lines', () =>
      pipe(unvalidated.lines, A.map(toValidatedOrderLine(checkProductCodeExists)), E.sequenceArray),
    ),
    TE.fromEither,
    TE.bind('checkedShippingAddress', () => pipe(unvalidated.shippingAddress, toCheckedAddress(checkAddressExists))),
    TE.bind('shippingAddress', ({ checkedShippingAddress }) => pipe(checkedShippingAddress, toAddress, TE.fromEither)),
    TE.bind('checkedBillingAddress', () => pipe(unvalidated.billingAddress, toCheckedAddress(checkAddressExists))),
    TE.bind('billingAddress', ({ checkedBillingAddress }) => pipe(checkedBillingAddress, toAddress, TE.fromEither)),
    TE.map((i) => new ValidatedOrder(i.orderId, i.customerInfo, i.shippingAddress, i.billingAddress, i.lines)),
  );

// ---------------------------
// PriceOrder step
// ---------------------------

const toPricedOrderLine = (getProductPrice: GetProductPrice) => (validatedOrderLine: ValidatedOrderLine) => {
  const qty = validatedOrderLine.quantity.value;
  const price = getProductPrice(validatedOrderLine.productCode);
  return pipe(
    E.Do,
    E.bind('linePrice', () =>
      pipe(
        qty,
        price.multiply,
        E.mapLeft((e) => new PricingError(e)),
      ),
    ),
    E.map(
      (i) =>
        new PricedOrderLine(
          validatedOrderLine.orderLineId,
          validatedOrderLine.productCode,
          validatedOrderLine.quantity,
          i.linePrice,
        ),
    ),
  );
};

const priceOrder: PriceOrder = (getProductPrice) => (validatedOrder) =>
  pipe(
    E.Do,
    E.bind('lines', () =>
      pipe(
        validatedOrder.lines,
        A.map(toPricedOrderLine(getProductPrice)),
        E.sequenceArray, // convert list of Results to a single Result
      ),
    ),
    E.bind('amountToBill', ({ lines }) =>
      pipe(
        lines,
        A.map((l: PricedOrderLine) => l.linePrice), // get each line price
        Common.BillingAmount.sumPrices, // add them together as a BillingAmount
        E.mapLeft((e) => new PricingError(e)), // convert to PlaceOrderError
      ),
    ),
    E.map(
      (i) =>
        new PricedOrder(
          validatedOrder.orderId,
          validatedOrder.customerInfo,
          validatedOrder.shippingAddress,
          validatedOrder.billingAddress,
          i.amountToBill,
          i.lines,
        ),
    ),
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
): PlaceOrder =>
  flow(
    validateOrder(checkCode, checkAddress),
    TE.chain<PlaceOrderError, ValidatedOrder, PricedOrder>(TE.fromEitherK(priceOrder(getPrice))),
    TE.map(placeOrderEvents(createAck, sendAck)),
  );
