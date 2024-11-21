// ======================================================
// This file contains the logic for working with data transfer objects (DTOs)
//
// This represents the code in chapter 11, "Serialization"
//
// Each type of DTO is defined using primitive, serializable types
// and then there are `toDomain` and `fromDomain` functions defined for each DTO.
//
// ======================================================
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import { pipe } from 'fp-ts/function';
import { match, P } from 'ts-pattern';
import { bound } from '../../libs/decorator';
import * as Common from '../common-types';
import {
  BillableOrderPlaced,
  OrderAcknowledgmentSent,
  OrderPlaced,
  PlaceOrderError,
  PlaceOrderEvent,
  PricedOrderLine,
  PricingError,
  RemoteServiceError,
  UnvalidatedAddress,
  UnvalidatedCustomerInfo,
  UnvalidatedOrder,
  UnvalidatedOrderLine,
  ValidationError,
} from './public-types';

// ==================================
// DTOs for PlaceOrder workflow
// ==================================

//===============================================
// DTO for CustomerInfo
//===============================================

export class CustomerInfoDto {
  constructor(
    readonly firstName: string,
    readonly lastName: string,
    readonly emailAddress: string,
  ) { }
  /// Convert the DTO into a UnvalidatedCustomerInfo object.
  /// This always succeeds because there is no validation.
  /// Used when importing an OrderForm from the outside world into the domain.
  @bound
  toUnvalidatedCustomerInfo(): UnvalidatedCustomerInfo {
    // sometimes it's helpful to use an explicit type annotation
    // to avoid ambiguity between records with the same field names.

    // this is a simple 1:1 copy which always succeeds
    return new UnvalidatedCustomerInfo(this.firstName, this.lastName, this.emailAddress);
  }

  /// Convert the DTO into a CustomerInfo object
  /// Used when importing from the outside world into the domain, eg loading from a database
  @bound
  toDomain(): E.Either<Error, Common.CustomerInfo> {
    return pipe(
      E.Do,
      // get each (validated) simple type from the DTO as a success or failure
      E.bind('first', () => Common.String50.create(this.firstName)),
      E.bind('last', () => Common.String50.create(this.lastName)),
      E.bind('email', () => Common.EmailAddress.create(this.emailAddress)),
      // combine the components to create the domain object
      E.let('name', ({ first, last }) => new Common.PersonalName(first, last)),
      E.map(scope => new Common.CustomerInfo(scope.name, scope.email)),
    );
  }

  /// Convert a CustomerInfo object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: Common.CustomerInfo): CustomerInfoDto {
    // this is a simple 1:1 copy
    return new CustomerInfoDto(
      domainObj.name.firstName.value,
      domainObj.name.lastName.value,
      domainObj.emailAddress.value,
    );
  }
}

//===============================================
// DTO for Address
//===============================================

export class AddressDto {
  constructor(
    readonly addressLine1: string,
    readonly city: string,
    readonly zipCode: string,
    readonly addressLine2: O.Option<string>,
    readonly addressLine3: O.Option<string>,
    readonly addressLine4: O.Option<string>,
  ) { }

  /// Convert the DTO into a UnvalidatedAddress
  /// This always succeeds because there is no validation.
  /// Used when importing an OrderForm from the outside world into the domain.
  @bound
  toUnvalidatedAddress(): UnvalidatedAddress {
    // this is a simple 1:1 copy
    return new UnvalidatedAddress(
      this.addressLine1,
      this.city,
      this.zipCode,
      this.addressLine2,
      this.addressLine3,
      this.addressLine4,
    );
  }

  /// Convert the DTO into a Address object
  /// Used when importing from the outside world into the domain, eg loading from a database.
  @bound
  toDomain(): E.Either<Error, Common.Address> {
    const optEthToEthOpt: <E, T>(i: O.Option<E.Either<E, T>>) => E.Either<E, O.Option<T>> = O.match(() => E.right(O.none), E.map(O.some));
    return pipe(
      E.Do,
      // get each (validated) simple type from the DTO as a success or failure
      E.bind('addressLine1', () => Common.String50.create(this.addressLine1)),
      E.bind('addressLine2', () => pipe(this.addressLine2, O.map(Common.String50.create), optEthToEthOpt)),
      E.bind('addressLine3', () => pipe(this.addressLine3, O.map(Common.String50.create), optEthToEthOpt)),
      E.bind('addressLine4', () => pipe(this.addressLine4, O.map(Common.String50.create), optEthToEthOpt)),
      E.bind('city', () => Common.String50.create(this.city)),
      E.bind('zipCode', () => Common.ZipCode.create(this.zipCode)),
      // combine the components to create the domain object
      E.map(scope => new Common.Address(
        scope.addressLine1,
        scope.addressLine2,
        scope.addressLine3,
        scope.addressLine4,
        scope.city,
        scope.zipCode,
      )),
    );
  }

  /// Convert a Address object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: Common.Address): AddressDto {
    // this is a simple 1:1 copy
    return new AddressDto(
      domainObj.addressLine1.value,
      domainObj.city.value,
      domainObj.zipCode.value,
      pipe(
        domainObj.addressLine2,
        O.map(i => i.value),
      ),
      pipe(
        domainObj.addressLine3,
        O.map(i => i.value),
      ),
      pipe(
        domainObj.addressLine4,
        O.map(i => i.value),
      ),
    );
  }
}

//===============================================
// DTOs for OrderLines
//===============================================

/// From the order form used as input
export class OrderFormLineDto {
  constructor(
    readonly orderLineId: string,
    readonly productCode: string,
    readonly quantity: number,
  ) { }

  /// Convert the OrderFormLine into a UnvalidatedOrderLine
  /// This always succeeds because there is no validation.
  /// Used when importing an OrderForm from the outside world into the domain.
  @bound
  toUnvalidatedOrderLine(): UnvalidatedOrderLine {
    // this is a simple 1:1 copy
    return new UnvalidatedOrderLine(this.orderLineId, this.productCode, this.quantity);
  }
}

//===============================================
// DTOs for PricedOrderLines
//===============================================

/// Used in the output of the workflow
export class PricedOrderLineDto {
  constructor(
    readonly orderLineId: string,
    readonly productCode: string,
    readonly quantity: number,
    readonly linePrice: number,
  ) { }

  /// Convert a PricedOrderLine object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: PricedOrderLine): PricedOrderLineDto {
    // this is a simple 1:1 copy
    return new PricedOrderLineDto(
      domainObj.orderLineId.value,
      domainObj.productCode.value,
      domainObj.quantity.value,
      domainObj.linePrice.value,
    );
  }
}

//===============================================
// DTO for OrderForm
//===============================================

export class OrderFormDto {
  constructor(
    readonly orderId: string,
    readonly customerInfo: CustomerInfoDto,
    readonly shippingAddress: AddressDto,
    readonly billingAddress: AddressDto,
    readonly lines: OrderFormLineDto[],
  ) { }

  /// Convert the OrderForm into a UnvalidatedOrder
  /// This always succeeds because there is no validation.
  @bound
  toUnvalidatedOrder(): UnvalidatedOrder {
    return new UnvalidatedOrder(
      this.orderId,
      this.customerInfo.toUnvalidatedCustomerInfo(),
      this.shippingAddress.toUnvalidatedAddress(),
      this.billingAddress.toUnvalidatedAddress(),
      this.lines.map(l => l.toUnvalidatedOrderLine()),
    );
  }
}

//===============================================
// DTO for OrderPlaced event
//===============================================

/// Event to send to shipping context
export class OrderPlacedDto {
  constructor(
    readonly orderId: string,
    readonly customerInfo: CustomerInfoDto,
    readonly shippingAddress: AddressDto,
    readonly billingAddress: AddressDto,
    readonly amountToBill: number,
    readonly lines: PricedOrderLineDto[],
  ) { }

  /// Convert a OrderPlaced object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: OrderPlaced): OrderPlacedDto {
    return new OrderPlacedDto(
      domainObj.orderId.value,
      CustomerInfoDto.fromDomain(domainObj.customerInfo),
      AddressDto.fromDomain(domainObj.shippingAddress),
      AddressDto.fromDomain(domainObj.billingAddress),
      domainObj.amountToBill.value,
      pipe(domainObj.lines, RA.map(PricedOrderLineDto.fromDomain), RA.toArray),
    );
  }
}

//===============================================
// DTO for BillableOrderPlaced event
//===============================================

/// Event to send to billing context
export class BillableOrderPlacedDto {
  constructor(
    readonly orderId: string,
    readonly billingAddress: AddressDto,
    readonly amountToBill: number,
  ) { }

  /// Convert a BillableOrderPlaced object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: BillableOrderPlaced): BillableOrderPlacedDto {
    return new BillableOrderPlacedDto(
      domainObj.orderId.value,
      AddressDto.fromDomain(domainObj.billingAddress),
      domainObj.amountToBill.value,
    );
  }
}

//===============================================
// DTO for OrderAcknowledgmentSent event
//===============================================

/// Event to send to other bounded contexts
export class OrderAcknowledgmentSentDto {
  constructor(
    readonly orderId: string,
    readonly emailAddress: string,
  ) { }

  /// Convert a OrderAcknowledgmentSent object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: OrderAcknowledgmentSent): OrderAcknowledgmentSentDto {
    return new OrderAcknowledgmentSentDto(domainObj.orderId.value, domainObj.emailAddress.value);
  }
}

//===============================================
// DTO for PlaceOrderEvent
//===============================================

/// Use a dictionary representation of a PlaceOrderEvent, suitable for JSON
/// See "Serializing Records and Choice Types Using Maps" in chapter 11
export type PlaceOrderEventDto =
  | { OrderPlaced: OrderPlacedDto }
  | { BillableOrderPlaced: BillableOrderPlacedDto }
  | { OrderAcknowledgmentSent: OrderAcknowledgmentSentDto };

/// Convert a PlaceOrderEvent into the corresponding DTO.
/// Used when exporting from the domain to the outside world.
export const placeOrderEventDtoFromDomain = (domainObj: PlaceOrderEvent): PlaceOrderEventDto =>
  Object.fromEntries([
    match(domainObj)
      .with(P.instanceOf(OrderPlaced), i =>
        ['OrderPlaced', OrderPlacedDto.fromDomain(i)] as const)
      .with(P.instanceOf(BillableOrderPlaced), i =>
        ['BillableOrderPlaced', BillableOrderPlacedDto.fromDomain(i)] as const)
      .with(P.instanceOf(OrderAcknowledgmentSent), i =>
        ['OrderAcknowledgmentSent', OrderAcknowledgmentSentDto.fromDomain(i)] as const,)
      .exhaustive(),
  ]);

//===============================================
// DTO for PlaceOrderError
//===============================================

export class PlaceOrderErrorDto {
  constructor(
    readonly code: string,
    readonly message: string,
  ) { }

  static fromDomain(domainObj: PlaceOrderError): PlaceOrderErrorDto {
    return match(domainObj)
      .with(P.instanceOf(ValidationError), err => new PlaceOrderErrorDto('ValidationError', err.message))
      .with(P.instanceOf(PricingError), err => new PlaceOrderErrorDto('PricingError', err.message))
      .with(P.instanceOf(RemoteServiceError), err =>
        new PlaceOrderErrorDto('RemoveServiceError', `${err.service.name}: ${err.exception.message}`))
      .exhaustive();
  }
}
