import * as O from 'fp-ts/Option';
import { match } from 'ts-pattern';
import { pipe } from 'fp-ts/function';
import { OrderAcknowledgement, Sent, NotSent } from './implementation.types';
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
  const acknowledgment = new OrderAcknowledgement(pricedOrder.customerInfo.emailAddress, letter);
  // if the acknowledgement was successfully sent,
  // return the corresponding event, else return None
  return match(sendAcknowledgment(acknowledgment))
    .with(Sent, () => O.some(new OrderAcknowledgmentSent(pricedOrder.orderId, pricedOrder.customerInfo.emailAddress)))
    .with(NotSent, () => O.none)
    .exhaustive();
};

// ---------------------------
// Create events
// ---------------------------

export const createOrderPlacedEvent = (i: PricedOrder) =>
  new OrderPlaced(i.orderId, i.customerInfo, i.shippingAddress, i.billingAddress, i.amountToBill, i.lines);

export const createBillingEvent = ({ orderId, billingAddress, amountToBill }: PricedOrder): O.Option<BillableOrderPlaced> => {
  return amountToBill.value > 0
    ? O.some(new BillableOrderPlaced(orderId, billingAddress, amountToBill))
    : O.none;
};

/// helper to convert an Option into a List
export const optionToList: <T>(opt: O.Option<T>) => Array<T> = O.fold(
  () => [],
  (x) => [x],
);

export const createEvents: CreateEvents = (pricedOrder, acknowledgmentEventOpt) => [
  // return all the events
  pipe(
    pricedOrder,
    createOrderPlacedEvent,
    (e) => new OrderPlaced(e.orderId, e.customerInfo, e.shippingAddress, e.billingAddress, e.amountToBill, e.lines),
  ),
  ...pipe(
    acknowledgmentEventOpt,
    O.map((e) => new OrderAcknowledgmentSent(e.orderId, e.emailAddress)),
    optionToList,
  ),
  ...pipe(
    pricedOrder,
    createBillingEvent,
    O.map((e) => new BillableOrderPlaced(e.orderId, e.billingAddress, e.amountToBill)),
    optionToList,
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
