import type { FieldBuilder } from "./field";

export type FormValidatorErrors = Record<string, string[]>;

export interface FormValidator {
  field(name: string): FieldBuilder;
  validate(): boolean;
  getErrors(): FormValidatorErrors;
  destroy(): void;
}
