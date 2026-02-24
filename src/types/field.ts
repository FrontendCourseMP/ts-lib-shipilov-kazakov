export type ValueKind = "string" | "number" | "array";

export type RuleKind =
  | "required"
  | "minlength"
  | "maxlength"
  | "pattern"
  | "type"
  | "min"
  | "max"
  | "step"
  | "minItems"
  | "maxItems"
  | "custom";

export interface RuleConfig {
  kind: RuleKind;
  message?: string;
  value?: number | string | RegExp;
}

export interface FieldBuilder {
  string(): FieldBuilder;
  number(): FieldBuilder;
  array(): FieldBuilder;
  required(message?: string): FieldBuilder;
  minlength(value: number, message?: string): FieldBuilder;
  maxlength(value: number, message?: string): FieldBuilder;
  pattern(value: string | RegExp, message?: string): FieldBuilder;
  type(value: string, message?: string): FieldBuilder;
  min(value: number, message?: string): FieldBuilder;
  max(value: number, message?: string): FieldBuilder;
  step(value: number, message?: string): FieldBuilder;
  minItems(value: number, message?: string): FieldBuilder;
  maxItems(value: number, message?: string): FieldBuilder;
  custom(message?: string): FieldBuilder;
}
