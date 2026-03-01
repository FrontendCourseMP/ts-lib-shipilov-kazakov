import type { FieldBuilder } from "./field";

export type ValidationErrors = Record<string, string>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
}

export interface FormOptions {
  bindOnSubmit?: boolean;
}

export type ValidateFn = () => ValidationResult;

export interface FormValidator {
  field(name: string): FieldBuilder;
  validate: ValidateFn;
  getErrors(): ValidationErrors;
  destroy(): void;
}
