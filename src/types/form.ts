import type { FieldBuilder } from "./field";

export type ValidationErrors = Record<string, string[]>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
}

export interface FormOptions {
  bindOnSubmit?: boolean;
}

export interface FormValidator {
  field(name: string): FieldBuilder;
  validate(): ValidationResult;
  getErrors(): ValidationErrors;
  destroy(): void;
}
