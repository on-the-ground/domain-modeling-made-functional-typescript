/* @name ReadOneCustomer */
SELECT customer_id, name, birthdate FROM customer WHERE customer_id = :customerId!;

/* @name ReadOneContact */
SELECT contact_id,is_email,is_phone,email_address,phone_number
   FROM contact_info
   WHERE contact_id = :contactId!;

/*
  @name InsertContact
  @param contacts -> ((contactId!, isEmail!, isPhone, emailAddress, phoneNumber)...)
*/
INSERT INTO contact_info (contact_id,is_email,is_phone,email_address,phone_number)
VALUES :contacts RETURNING *;