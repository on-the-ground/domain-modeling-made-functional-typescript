// ==================================
// Common compound types used throughout the OrderTaking domain
//
// Includes: customers, addresses, etc.
// Plus common errors.
//
// ==================================

import { Option } from 'fp-ts/Option';
import type { EmailAddress, String50, ZipCode } from './simple-types';

// ==================================
// Customer-related types
// ==================================

export class PersonalName {
  constructor(
    readonly firstName: String50,
    readonly lastName: String50,
  ) {}
}

export class CustomerInfo {
  constructor(
    readonly name: PersonalName,
    readonly emailAddress: EmailAddress,
  ) {}
}

// ==================================
// Address-related
// ==================================

export class Address {
  constructor(
    readonly AddressLine1: String50,
    readonly AddressLine2: Option<String50>,
    readonly AddressLine3: Option<String50>,
    readonly AddressLine4: Option<String50>,
    readonly City: String50,
    readonly ZipCode: ZipCode,
  ) {}
}

// ==================================
// Product-related types
// ==================================

// Note that the definition of a Product is in a different bounded
// context, and in this context, products are only represented by a ProductCode
// (see the SimpleTypes module).
