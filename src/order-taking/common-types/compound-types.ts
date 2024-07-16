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
    readonly addressLine1: String50,
    readonly addressLine2: Option<String50>,
    readonly addressLine3: Option<String50>,
    readonly addressLine4: Option<String50>,
    readonly city: String50,
    readonly zipCode: ZipCode,
  ) {}
}

// ==================================
// Product-related types
// ==================================

// Note that the definition of a Product is in a different bounded
// context, and in this context, products are only represented by a ProductCode
// (see the SimpleTypes module).
