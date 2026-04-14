/**
 * RUBJOB Validation Utilities
 * Native logic to minimize dependencies
 */

export const validateRequired = (value: any, fieldName: string) => {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    throw new Error(`${fieldName} is required`);
  }
};

export const validatePhone = (phone: string) => {
  const phoneRegex = /^[0-9+ ]{9,15}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error("Invalid phone number format");
  }
};

export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
};

export const validateNumber = (value: any, fieldName: string, options?: { min?: number; max?: number }) => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  if (options?.min !== undefined && num < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}`);
  }
  if (options?.max !== undefined && num > options.max) {
    throw new Error(`${fieldName} must not exceed ${options.max}`);
  }
  return num;
};

export const tryParseJSON = (value: any, fieldName: string) => {
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    throw new Error(`Invalid JSON format for ${fieldName}`);
  }
};
