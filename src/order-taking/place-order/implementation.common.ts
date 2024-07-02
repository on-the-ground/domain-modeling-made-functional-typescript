import * as O from 'fp-ts/Option';
import { match } from 'ts-pattern';
import { pipe } from 'fp-ts/function';
import { OrderAcknowledgment, Sent, NotSent } from './implementation.types';
import { OrderAcknowledgmentSent, OrderPlaced, BillableOrderPlaced } from './public-types';

import type {
  AcknowledgeOrder,
  CreateEvents,
  CreateOrderAcknowledgmentLetter,
  SendOrderAcknowledgment,
} from './implementation.types';
import type { PricedOrder, PlaceOrderEvent } from './public-types';

// ---------------------------
// AcknowledgeOrder step
// ---------------------------

export const acknowledgeOrder: AcknowledgeOrder = (createAcknowledgmentLetter, sendAcknowledgment) => (pricedOrder) => {
  const letter = createAcknowledgmentLetter(pricedOrder);
  const acknowledgment = new OrderAcknowledgment(pricedOrder.CustomerInfo.emailAddress, letter);
  // if the acknowledgement was successfully sent,
  // return the corresponding event, else return None
  return match(sendAcknowledgment(acknowledgment))
    .with(Sent, () => O.some(new OrderAcknowledgmentSent(pricedOrder.OrderId, pricedOrder.CustomerInfo.emailAddress)))
    .with(NotSent, () => O.none)
    .exhaustive();
};

// ---------------------------
// Create events
// ---------------------------

export const createOrderPlacedEvent = (i: PricedOrder) =>
  new OrderPlaced(i.OrderId, i.CustomerInfo, i.ShippingAddress, i.BillingAddress, i.AmountToBill, i.Lines);

export const createBillingEvent = (placedOrder: PricedOrder): O.Option<BillableOrderPlaced> => {
  return placedOrder.AmountToBill.value > 0
    ? O.some(new BillableOrderPlaced(placedOrder.OrderId, placedOrder.BillingAddress, placedOrder.AmountToBill))
    : O.none;
};

/// helper to convert an Option into a List
export const listOfOption: <T>(opt: O.Option<T>) => Array<T> = O.fold(
  () => [],
  (x) => [x],
);

export const createEvents: CreateEvents = (pricedOrder, acknowledgmentEventOpt) => [
  // return all the events
  ...pipe(
    acknowledgmentEventOpt,
    O.map((i) => new OrderAcknowledgmentSent(i.OrderId, i.EmailAddress)),
    listOfOption,
  ),
  pipe(
    pricedOrder,
    createOrderPlacedEvent,
    (e) => new OrderPlaced(e.OrderId, e.CustomerInfo, e.ShippingAddress, e.BillingAddress, e.AmountToBill, e.Lines),
  ),
  ...pipe(
    pricedOrder,
    createBillingEvent,
    O.map((e) => new BillableOrderPlaced(e.OrderId, e.BillingAddress, e.AmountToBill)),
    listOfOption,
  ),
];

export const placeOrderEvents =
  (
    createOrderAcknowledgmentLetter: CreateOrderAcknowledgmentLetter,
    sendOrderAcknowledgment: SendOrderAcknowledgment,
  ) =>
  (pricedOrder: PricedOrder): PlaceOrderEvent[] => {
    const ackOpt = acknowledgeOrder(createOrderAcknowledgmentLetter, sendOrderAcknowledgment)(pricedOrder);
    return createEvents(pricedOrder, ackOpt);
  };
