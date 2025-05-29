// ======================================================
// This file contains the JSON API interface to the PlaceOrder workflow
//
// 1) The HttpRequest is turned into a DTO, which is then turned into a Domain object
// 2) The main workflow function is called
// 3) The output is turned into a DTO which is turned into a HttpResponse
// ======================================================

import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { Price } from '../common-types';
import { OrderFormDto, PlaceOrderErrorDto, placeOrderEventDtoFromDomain } from './dto';
import { createCheckedAddress, HtmlString, Sent } from './implementation.types';

import type {
  CheckAddressExists,
  CheckProductCodeExists,
  CreateOrderAcknowledgmentLetter,
  GetProductPrice,
  SendOrderAcknowledgment,
} from './implementation.types';
import { placeOrder } from './implementation';

type JsonString = string;

namespace Json {
  // This function serialize a domain object into a json string
  export const serialize = JSON.stringify

  // This function deserialize a json string into a domain object
  export const deserialize = <T extends object>(cls: { prototype: T }) => E.tryCatchK(
    flow(
      JSON.parse,
      obj => Object.setPrototypeOf(obj, cls.prototype) as T,
    ),
    e => e,
  )
}

/// Very simplified version!
class HttpRequest {
  constructor(
    readonly action: string,
    readonly uri: string,
    readonly body: JsonString,
  ) { }
}

/// Very simplified version!
class HttpResponse {
  constructor(
    readonly httpStatusCode: number,
    readonly body: JsonString,
  ) { }
}

/// An API takes a HttpRequest as input and returns a async response
type PlaceOrderApi = (i: HttpRequest) => Promise<HttpResponse>;

// =============================
// Implementation
// =============================

// setup dummy dependencies

export const checkProductExists: CheckProductCodeExists = productCode => true; // dummy implementation

export const checkAddressExists: CheckAddressExists = flow(createCheckedAddress, E.right, TE.fromEither);

export const getProductPrice: GetProductPrice = productCode => Price.unsafeCreate(1); // dummy implementation

export const createOrderAcknowledgmentLetter: CreateOrderAcknowledgmentLetter = pricedOrder =>
  new HtmlString('some text'); // dummy implementation

export const sendOrderAcknowledgment: SendOrderAcknowledgment = orderAcknowledgement => Sent;

// -------------------------------
// workflow
// -------------------------------

export const placeOrderApi: PlaceOrderApi = (request: HttpRequest) => pipe(
  request.body,             // orderFormJson
  Json.deserialize(OrderFormDto), // following the approach in "A Complete Serialization Pipeline" in chapter 11
  E.map((orderForm) => orderForm.toUnvalidatedOrder()), // convert to domain object
  TE.fromEither,
  TE.flatMap(
    // now we are in the pure domain
    placeOrder(
      // setup the dependencies. See "Injecting Dependencies" in chapter 9
      checkProductExists,
      checkAddressExists,
      getProductPrice,
      createOrderAcknowledgmentLetter,
      sendOrderAcknowledgment,
    ),
  ),
)().then(
  // now convert from the pure domain back to a HttpResponse
  E.match(
    flow(
      PlaceOrderErrorDto.fromDomain,
      Json.serialize,
      json => new HttpResponse(401, json),
    ),
    flow(
      A.map(placeOrderEventDtoFromDomain),
      Json.serialize,
      json => new HttpResponse(200, json),
    ),
  ),
)