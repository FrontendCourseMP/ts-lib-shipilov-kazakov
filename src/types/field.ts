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

export interface StringFieldChain {
  required(message?: string): StringFieldChain;
  minlength(value: number, message?: string): StringFieldChain;
  maxlength(value: number, message?: string): StringFieldChain;
  pattern(value: string | RegExp, message?: string): StringFieldChain;
  type(value: string, message?: string): StringFieldChain;
  custom(message?: string): StringFieldChain;
}

export interface NumberFieldChain {
  required(message?: string): NumberFieldChain;
  min(value: number, message?: string): NumberFieldChain;
  max(value: number, message?: string): NumberFieldChain;
  step(value: number, message?: string): NumberFieldChain;
  custom(message?: string): NumberFieldChain;
}

export interface ArrayFieldChain {
  required(message?: string): ArrayFieldChain;
  minItems(value: number, message?: string): ArrayFieldChain;
  maxItems(value: number, message?: string): ArrayFieldChain;
  custom(message?: string): ArrayFieldChain;
}

export interface FieldBuilder {
  string(): StringFieldChain;
  number(): NumberFieldChain;
  array(): ArrayFieldChain;
}
