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
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { Price } from '../common-types';
import { OrderFormDto, PlaceOrderErrorDto, placeOrderEventDtoFromDomain } from './dto';
import * as Implementation from './implementation';
import type {
  CheckProductCodeExists,
  CreateOrderAcknowledgmentLetter,
  GetProductPrice,
  SendOrderAcknowledgment,
} from './implementation.types';
import { CheckedAddress, HtmlString, Sent } from './implementation.types';
import type { PlaceOrderError, PlaceOrderEvent } from './public-types';

type JsonString = string;

/// Very simplified version!
class HttpRequest {
  constructor(
    readonly action: string,
    readonly uri: string,
    readonly body: JsonString,
  ) {}
}

/// Very simplified version!
class HttpResponse {
  constructor(
    readonly httpStatusCode: number,
    readonly body: JsonString,
  ) {}
}

/// An API takes a HttpRequest as input and returns a async response
type PlaceOrderApi = (i: HttpRequest) => Promise<HttpResponse>;

// =============================
// Implementation
// =============================

// setup dummy dependencies

export const checkProductExists: CheckProductCodeExists = (productCode) => true; // dummy implementation

export const checkAddressExists: Implementation.CheckAddressExists = flow(CheckedAddress, E.right, TE.fromEither);

export const getProductPrice: GetProductPrice = (productCode) => Price.unsafeCreate(1); // dummy implementation

export const createOrderAcknowledgmentLetter: CreateOrderAcknowledgmentLetter = (pricedOrder) =>
  new HtmlString('some text'); // dummy implementation

export const sendOrderAcknowledgment: SendOrderAcknowledgment = (orderAcknowledgement) => Sent;

// -------------------------------
// workflow
// -------------------------------

/// This function converts the workflow output into a HttpResponse
export const workflowResultToHttpReponse: (result: E.Either<PlaceOrderError, PlaceOrderEvent[]>) => HttpResponse =
  E.fold(
    (err) => pipe(err, PlaceOrderErrorDto.fromDomain, JSON.stringify, (json) => new HttpResponse(401, json)),
    (events) =>
      pipe(events, A.map(placeOrderEventDtoFromDomain), JSON.stringify, (json) => new HttpResponse(200, json)),
  );

export const placeOrderApi: PlaceOrderApi = (request: HttpRequest) => {
  // following the approach in "A Complete Serialization Pipeline" in chapter 11

  // start with a string
  const orderFormJson = request.body;
  const orderForm: OrderFormDto = pipe(orderFormJson, JSON.parse, (obj) =>
    Object.setPrototypeOf(obj, OrderFormDto.prototype),
  );

  // convert to domain object
  const unvalidatedOrder = OrderFormDto.toUnvalidatedOrder(orderForm);

  // setup the dependencies. See "Injecting Dependencies" in chapter 9
  const workflow = Implementation.placeOrder(
    checkProductExists,
    checkAddressExists,
    getProductPrice,
    createOrderAcknowledgmentLetter,
    sendOrderAcknowledgment,
  );

  return pipe(
    unvalidatedOrder,
    workflow, // now we are in the pure domain
    T.map(workflowResultToHttpReponse), // now convert from the pure domain back to a HttpResponse
  )();
};
