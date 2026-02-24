export type FieldKind = "string" | "number" | "array";

export type NativeConstraintKind =
  | "required"
  | "minlength"
  | "maxlength"
  | "pattern"
  | "type"
  | "min"
  | "max"
  | "step";

export type ValidationKind =
  | NativeConstraintKind
  | "minItems"
  | "maxItems"
  | "custom";

export type FormControlElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export type FieldValue = string | number | string[] | null;

export interface CustomRuleContext {
  name: string;
  form: HTMLFormElement;
  controls: FormControlElement[];
  value: FieldValue;
}

export type CustomValidator = (context: CustomRuleContext) => boolean;

export interface ValidationRule {
  kind: ValidationKind;
  message?: string;
  value?: number | string | RegExp;
  validator?: CustomValidator;
}

export interface FieldBuilder {
  string(): FieldBuilder;
  number(): FieldBuilder;
  array(): FieldBuilder;
  required(message?: string): FieldBuilder;
  custom(validator: CustomValidator, message?: string): FieldBuilder;
  minlength(length: number, message?: string): FieldBuilder;
  maxlength(length: number, message?: string): FieldBuilder;
  pattern(pattern: RegExp | string, message?: string): FieldBuilder;
  type(inputType: string, message?: string): FieldBuilder;
  min(value: number, message?: string): FieldBuilder;
  max(value: number, message?: string): FieldBuilder;
  step(value: number, message?: string): FieldBuilder;
  minItems(count: number, message?: string): FieldBuilder;
  maxItems(count: number, message?: string): FieldBuilder;
}

export type StringFieldBuilder = FieldBuilder;
export type NumberFieldBuilder = FieldBuilder;
export type ArrayFieldBuilder = FieldBuilder;

export interface FormValidator {
  field(name: string): FieldBuilder;
  validate(): boolean;
  getErrors(): Record<string, string[]>;
  destroy(): void;
}
