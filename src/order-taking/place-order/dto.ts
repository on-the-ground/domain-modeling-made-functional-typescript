// ======================================================
// This file contains the logic for working with data transfer objects (DTOs)
//
// This represents the code in chapter 11, "Serialization"
//
// Each type of DTO is defined using primitive, serializable types
// and then there are `toDomain` and `fromDomain` functions defined for each DTO.
//
// ======================================================
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import * as Common from '../common-types';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { match, P } from 'ts-pattern';
import {
  UnvalidatedCustomerInfo,
  UnvalidatedAddress,
  UnvalidatedOrderLine,
  PricedOrderLine,
  UnvalidatedOrder,
  OrderPlaced,
  BillableOrderPlaced,
  OrderAcknowledgmentSent,
  PlaceOrderEvent,
  PlaceOrderError,
  ValidationError,
  PricingError,
  RemoteServiceError,
} from './public-types';

// ==================================
// DTOs for PlaceOrder workflow
// ==================================

//===============================================
// DTO for CustomerInfo
//===============================================

export class CustomerInfoDto {
  constructor(
    readonly FirstName: string,
    readonly LastName: string,
    readonly EmailAddress: string,
  ) {}
  /// Convert the DTO into a UnvalidatedCustomerInfo object.
  /// This always succeeds because there is no validation.
  /// Used when importing an OrderForm from the outside world into the domain.
  static toUnvalidatedCustomerInfo(dto: CustomerInfoDto): UnvalidatedCustomerInfo {
    // sometimes it's helpful to use an explicit type annotation
    // to avoid ambiguity between records with the same field names.

    // this is a simple 1:1 copy which always succeeds
    return new UnvalidatedCustomerInfo(dto.FirstName, dto.LastName, dto.EmailAddress);
  }

  /// Convert the DTO into a CustomerInfo object
  /// Used when importing from the outside world into the domain, eg loading from a database
  static toCustomerInfo(dto: CustomerInfoDto): E.Either<string, Common.CustomerInfo> {
    return pipe(
      E.Do,
      // get each (validated) simple type from the DTO as a success or failure
      E.bind('first', () => Common.String50.create('FirstName')(dto.FirstName)),
      E.bind('last', () => Common.String50.create('LastName')(dto.LastName)),
      E.bind('email', () => Common.EmailAddress.create('EmailAddress')(dto.EmailAddress)),
      // combine the components to create the domain object
      E.bind('name', ({ first, last }) => E.right(new Common.PersonalName(first, last))),
      E.map(({ name, email }) => new Common.CustomerInfo(name, email)),
    );
  }

  /// Convert a CustomerInfo object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromCustomerInfo(domainObj: Common.CustomerInfo): CustomerInfoDto {
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
    readonly AddressLine1: string,
    readonly City: string,
    readonly ZipCode: string,
    readonly AddressLine2?: string,
    readonly AddressLine3?: string,
    readonly AddressLine4?: string,
  ) {}

  /// Convert the DTO into a UnvalidatedAddress
  /// This always succeeds because there is no validation.
  /// Used when importing an OrderForm from the outside world into the domain.
  static toUnvalidatedAddress(dto: AddressDto): UnvalidatedAddress {
    // this is a simple 1:1 copy
    return new UnvalidatedAddress(
      dto.AddressLine1,
      dto.AddressLine2,
      dto.AddressLine3,
      dto.AddressLine4,
      dto.City,
      dto.ZipCode,
    );
  }

  /// Convert the DTO into a Address object
  /// Used when importing from the outside world into the domain, eg loading from a database.
  static toAddress(dto: AddressDto): E.Either<string, Common.Address> {
    return pipe(
      E.Do,
      // get each (validated) simple type from the DTO as a success or failure
      E.bind('addressLine1', () => Common.String50.create('AddressLine1')(dto.AddressLine1)),
      E.bind('addressLine2', () => Common.String50.createOption('AddressLine2')(dto.AddressLine2)),
      E.bind('addressLine3', () => Common.String50.createOption('AddressLine3')(dto.AddressLine3)),
      E.bind('addressLine4', () => Common.String50.createOption('AddressLine4')(dto.AddressLine4)),
      E.bind('city', () => Common.String50.create('City')(dto.City)),
      E.bind('zipCode', () => Common.ZipCode.create('ZipCode')(dto.ZipCode)),
      // combine the components to create the domain object
      E.map(
        (i) => new Common.Address(i.addressLine1, i.addressLine2, i.addressLine3, i.addressLine4, i.city, i.zipCode),
      ),
    );
  }

  /// Convert a Address object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromAddress(domainObj: Common.Address): AddressDto {
    // this is a simple 1:1 copy
    return new AddressDto(
      domainObj.AddressLine1.value,
      domainObj.City.value,
      domainObj.ZipCode.value,
      pipe(
        domainObj.AddressLine2,
        O.map((i) => i.value),
        O.toNullable,
      ),
      pipe(
        domainObj.AddressLine3,
        O.map((i) => i.value),
        O.toNullable,
      ),
      pipe(
        domainObj.AddressLine4,
        O.map((i) => i.value),
        O.toNullable,
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
    readonly OrderLineId: string,
    readonly ProductCode: string,
    readonly Quantity: number,
  ) {}

  /// Convert the OrderFormLine into a UnvalidatedOrderLine
  /// This always succeeds because there is no validation.
  /// Used when importing an OrderForm from the outside world into the domain.
  static toUnvalidatedOrderLine(dto: OrderFormLineDto): UnvalidatedOrderLine {
    // this is a simple 1:1 copy
    return new UnvalidatedOrderLine(dto.OrderLineId, dto.ProductCode, dto.Quantity);
  }
}

//===============================================
// DTOs for PricedOrderLines
//===============================================

/// Used in the output of the workflow
export class PricedOrderLineDto {
  constructor(
    readonly OrderLineId: string,
    readonly ProductCode: string,
    readonly Quantity: number,
    readonly LinePrice: number,
  ) {}

  /// Convert a PricedOrderLine object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: PricedOrderLine): PricedOrderLineDto {
    // this is a simple 1:1 copy
    return new PricedOrderLineDto(
      domainObj.OrderLineId.value,
      domainObj.ProductCode.value,
      domainObj.Quantity.value,
      domainObj.LinePrice.value,
    );
  }
}

//===============================================
// DTO for OrderForm
//===============================================

export class OrderFormDto {
  constructor(
    readonly OrderId: string,
    readonly CustomerInfo: CustomerInfoDto,
    readonly ShippingAddress: AddressDto,
    readonly BillingAddress: AddressDto,
    readonly Lines: OrderFormLineDto[],
  ) {}

  /// Convert the OrderForm into a UnvalidatedOrder
  /// This always succeeds because there is no validation.
  static toUnvalidatedOrder(dto: OrderFormDto): UnvalidatedOrder {
    return new UnvalidatedOrder(
      dto.OrderId,
      CustomerInfoDto.toUnvalidatedCustomerInfo(dto.CustomerInfo),
      AddressDto.toUnvalidatedAddress(dto.ShippingAddress),
      AddressDto.toUnvalidatedAddress(dto.BillingAddress),
      pipe(dto.Lines, A.map(OrderFormLineDto.toUnvalidatedOrderLine)),
    );
  }
}

//===============================================
// DTO for OrderPlaced event
//===============================================

/// Event to send to shipping context
export class OrderPlacedDto {
  constructor(
    readonly OrderId: string,
    readonly CustomerInfo: CustomerInfoDto,
    readonly ShippingAddress: AddressDto,
    readonly BillingAddress: AddressDto,
    readonly AmountToBill: number,
    readonly Lines: PricedOrderLineDto[],
  ) {}

  /// Convert a OrderPlaced object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: OrderPlaced): OrderPlacedDto {
    return new OrderPlacedDto(
      domainObj.OrderId.value,
      CustomerInfoDto.fromCustomerInfo(domainObj.CustomerInfo),
      AddressDto.fromAddress(domainObj.ShippingAddress),
      AddressDto.fromAddress(domainObj.BillingAddress),
      domainObj.AmountToBill.value,
      pipe(domainObj.Lines, A.map(PricedOrderLineDto.fromDomain)),
    );
  }
}

//===============================================
// DTO for BillableOrderPlaced event
//===============================================

/// Event to send to billing context
export class BillableOrderPlacedDto {
  constructor(
    readonly OrderId: string,
    readonly BillingAddress: AddressDto,
    readonly AmountToBill: number,
  ) {}

  /// Convert a BillableOrderPlaced object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: BillableOrderPlaced): BillableOrderPlacedDto {
    return new BillableOrderPlacedDto(
      domainObj.OrderId.value,
      AddressDto.fromAddress(domainObj.BillingAddress),
      domainObj.AmountToBill.value,
    );
  }
}

//===============================================
// DTO for OrderAcknowledgmentSent event
//===============================================

/// Event to send to other bounded contexts
export class OrderAcknowledgmentSentDto {
  constructor(
    readonly OrderId: string,
    readonly EmailAddress: string,
  ) {}

  /// Convert a OrderAcknowledgmentSent object into the corresponding DTO.
  /// Used when exporting from the domain to the outside world.
  static fromDomain(domainObj: OrderAcknowledgmentSent): OrderAcknowledgmentSentDto {
    return new OrderAcknowledgmentSentDto(domainObj.OrderId.value, domainObj.EmailAddress.value);
  }
}

//===============================================
// DTO for PlaceOrderEvent
//===============================================

/// Use a dictionary representation of a PlaceOrderEvent, suitable for JSON
/// See "Serializing Records and Choice Types Using Maps" in chapter 11
export type PlaceOrderEventDto = Map<string, Object>;

/// Convert a PlaceOrderEvent into the corresponding DTO.
/// Used when exporting from the domain to the outside world.
export const placeOrderEventDtoFromDomain = (domainObj: PlaceOrderEvent): PlaceOrderEventDto =>
  pipe(
    match(domainObj)
      .with(P.instanceOf(OrderPlaced), (i) => ['OrderPlaced', OrderPlacedDto.fromDomain(i)] as const)
      .with(
        P.instanceOf(BillableOrderPlaced),
        (i) => ['BillableOrderPlaced', BillableOrderPlacedDto.fromDomain(i)] as const,
      )
      .with(
        P.instanceOf(OrderAcknowledgmentSent),
        (i) => ['OrderAcknowledgmentSent', OrderAcknowledgmentSentDto.fromDomain(i)] as const,
      )
      .exhaustive(),
    (kvPair: readonly [string, Object]) => new Map([kvPair]),
  );

//===============================================
// DTO for PlaceOrderError
//===============================================

export class PlaceOrderErrorDto {
  constructor(
    readonly Code: string,
    readonly Message: string,
  ) {}

  static fromDomain(domainObj: PlaceOrderError): PlaceOrderErrorDto {
    return match(domainObj)
      .with(P.instanceOf(ValidationError), (err) => new PlaceOrderErrorDto('ValidationError', err.msg))
      .with(P.instanceOf(PricingError), (err) => new PlaceOrderErrorDto('PricingError', err.msg))
      .with(
        P.instanceOf(RemoteServiceError),
        (err) => new PlaceOrderErrorDto('RemoveServiceError', `${err.Service.Name}: ${err.Exception.message}`),
      )
      .exhaustive();
  }
}
