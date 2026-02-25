export type ValueKind = "string" | "number" | "array";

export type NativeConstraintKind =
  | "required"
  | "minlength"
  | "maxlength"
  | "pattern"
  | "type"
  | "min"
  | "max"
  | "step";

export type RuleKind =
  | NativeConstraintKind
  | "minItems"
  | "maxItems"
  | "custom";

export type FormControl =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export type FieldValue = string | number | string[] | null;

export interface CustomRuleContext {
  name: string;
  form: HTMLFormElement;
  controls: FormControl[];
  value: FieldValue;
}

export type CustomRuleValidator = (context: CustomRuleContext) => boolean;

export interface RuleConfig {
  kind: RuleKind;
  message?: string;
  value?: number | string | RegExp;
  validator?: CustomRuleValidator;
}

export interface StringFieldChain {
  required(message?: string): StringFieldChain;
  minlength(value: number, message?: string): StringFieldChain;
  maxlength(value: number, message?: string): StringFieldChain;
  pattern(value: string | RegExp, message?: string): StringFieldChain;
  type(value: string, message?: string): StringFieldChain;
  custom(validator: CustomRuleValidator, message?: string): StringFieldChain;
}

export interface NumberFieldChain {
  required(message?: string): NumberFieldChain;
  min(value: number, message?: string): NumberFieldChain;
  max(value: number, message?: string): NumberFieldChain;
  step(value: number, message?: string): NumberFieldChain;
  custom(validator: CustomRuleValidator, message?: string): NumberFieldChain;
}

export interface ArrayFieldChain {
  required(message?: string): ArrayFieldChain;
  minItems(value: number, message?: string): ArrayFieldChain;
  maxItems(value: number, message?: string): ArrayFieldChain;
  custom(validator: CustomRuleValidator, message?: string): ArrayFieldChain;
}

export interface FieldBuilder {
  string(): StringFieldChain;
  number(): NumberFieldChain;
  array(): ArrayFieldChain;
}
