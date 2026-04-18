export type FieldErrors = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,15}$/;

export function validateLogin(form: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

export function validateRegister(form: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (form.firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters.";
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (form.lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = "Password must contain at least one uppercase letter.";
  } else if (!/[a-z]/.test(form.password)) {
    errors.password = "Password must contain at least one lowercase letter.";
  } else if (!/[0-9]/.test(form.password)) {
    errors.password = "Password must contain at least one number.";
  } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password)) {
    errors.password = "Password must contain at least one special character.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function validateUser(form: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (form.firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters.";
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (form.lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (form.phone && !PHONE_REGEX.test(form.phone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  return errors;
}

export function validateCustomer(form: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (form.firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters.";
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (form.lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (form.phone && !PHONE_REGEX.test(form.phone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  return errors;
}

export function validateOrder(form: {
  customerId: number;
  orderDate: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  notes?: string;
  orderItems: { inventoryId: number; quantity: number }[];
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.customerId || form.customerId <= 0) {
    errors.customerId = "Please select a customer.";
  }

  if (!form.orderDate) {
    errors.orderDate = "Order date is required.";
  }

  if (!form.orderItems || form.orderItems.length === 0) {
    errors.orderItems = "At least one order item is required.";
  } else {
    for (let i = 0; i < form.orderItems.length; i++) {
      const item = form.orderItems[i];
      if (!item.inventoryId || item.inventoryId <= 0) {
        errors[`orderItems_${i}_inventoryId`] = `Item ${i + 1}: Please select a product.`;
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`orderItems_${i}_quantity`] = `Item ${i + 1}: Quantity must be greater than zero.`;
      }
    }
  }

  return errors;
}

export function validateUpdateOrder(form: {
  status?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  notes?: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  // All fields are optional on update; no required validation needed
  return errors;
}

export function validateInventory(form: {
  productName: string;
  productDescription?: string;
  sku?: string;
  stockQuantity: number;
  unitPrice: number;
  isAvailable: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.productName.trim()) {
    errors.productName = "Product name is required.";
  } else if (form.productName.trim().length < 2) {
    errors.productName = "Product name must be at least 2 characters.";
  }

  if (form.stockQuantity < 0) {
    errors.stockQuantity = "Stock quantity cannot be negative.";
  }

  if (form.unitPrice < 0) {
    errors.unitPrice = "Unit price cannot be negative.";
  } else if (form.unitPrice === 0) {
    errors.unitPrice = "Unit price must be greater than zero.";
  }

  return errors;
}
