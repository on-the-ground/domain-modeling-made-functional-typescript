/** Types generated for queries found in "src/order-taking/queries.sql" */
import { PreparedQuery } from '@pgtyped/runtime';
import { TaskEither } from 'fp-ts/lib/TaskEither';

/** 'ReadOneCustomer' parameters type */
export interface IReadOneCustomerParams {
  customerId: number;
}

/** 'ReadOneCustomer' return type */
export interface IReadOneCustomerResult {
  birthdate: Date | null;
  customer_id: number;
  name: string;
}

/** 'ReadOneCustomer' query type */
export interface IReadOneCustomerQuery {
  params: IReadOneCustomerParams;
  result: IReadOneCustomerResult;
}

const readOneCustomerIR: any = { "usedParamSet": { "customerId": true }, "params": [{ "name": "customerId", "required": true, "transform": { "type": "scalar" }, "locs": [{ "a": 70, "b": 81 }] }], "statement": "SELECT customer_id, name, birthdate FROM customer WHERE customer_id = :customerId!" };

/**
 * Query generated from SQL:
 * ```
 * SELECT customer_id, name, birthdate FROM customer WHERE customer_id = :customerId!
 * ```
 */
export const readOneCustomer = new PreparedQuery<IReadOneCustomerParams, IReadOneCustomerResult>(readOneCustomerIR);


/** 'ReadOneContact' parameters type */
export interface IReadOneContactParams {
  contactId: number;
}

/** 'ReadOneContact' return type */
export interface IReadOneContactResult {
  contact_id: number;
  email_address: string | null;
  is_email: boolean;
  is_phone: boolean;
  phone_number: string | null;
}

/** 'ReadOneContact' query type */
export interface IReadOneContactQuery {
  params: IReadOneContactParams;
  result: IReadOneContactResult;
}

const readOneContactIR: any = { "usedParamSet": { "contactId": true }, "params": [{ "name": "contactId", "required": true, "transform": { "type": "scalar" }, "locs": [{ "a": 106, "b": 116 }] }], "statement": "SELECT contact_id,is_email,is_phone,email_address,phone_number\n   FROM contact_info\n   WHERE contact_id = :contactId!" };

/**
 * Query generated from SQL:
 * ```
 * SELECT contact_id,is_email,is_phone,email_address,phone_number
 *    FROM contact_info
 *    WHERE contact_id = :contactId!
 * ```
 */
export const readOneContact = new PreparedQuery<IReadOneContactParams, IReadOneContactResult>(readOneContactIR);


/** 'InsertContact' parameters type */
export interface IInsertContactParams {
  contacts: readonly ({
    contactId: number,
    isEmail: boolean,
    isPhone: boolean | null | void,
    emailAddress: string | null | void,
    phoneNumber: string | null | void
  })[];
}

/** 'InsertContact' return type */
export interface IInsertContactResult {
  contact_id: number;
  email_address: string | null;
  is_email: boolean;
  is_phone: boolean;
  phone_number: string | null;
}

/** 'InsertContact' query type */
export interface IInsertContactQuery {
  params: IInsertContactParams;
  result: IInsertContactResult;
}

const insertContactIR: any = { "usedParamSet": { "contacts": true }, "params": [{ "name": "contacts", "required": false, "transform": { "type": "pick_array_spread", "keys": [{ "name": "contactId", "required": true }, { "name": "isEmail", "required": true }, { "name": "isPhone", "required": false }, { "name": "emailAddress", "required": false }, { "name": "phoneNumber", "required": false }] }, "locs": [{ "a": 90, "b": 98 }] }], "statement": "INSERT INTO contact_info (contact_id,is_email,is_phone,email_address,phone_number)\nVALUES :contacts RETURNING *" };

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contact_info (contact_id,is_email,is_phone,email_address,phone_number)
 * VALUES :contacts RETURNING *
 * ```
 */
export const insertContact = new PreparedQuery<IInsertContactParams, IInsertContactResult>(insertContactIR);
