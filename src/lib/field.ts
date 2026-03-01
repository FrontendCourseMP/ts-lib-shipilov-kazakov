import type {
  ArrayFieldChain,
  FieldBuilder,
  NativeConstraintKind,
  NumberFieldChain,
  RuleConfig,
  StringFieldChain,
  ValueKind,
  CustomRuleValidator,
} from "../types";

export class FieldConfigurator
  implements FieldBuilder, StringFieldChain, NumberFieldChain, ArrayFieldChain
{
  private kind: ValueKind;

  private readonly rules: RuleConfig[] = [];

  private readonly nativeMessages: Partial<
    Record<NativeConstraintKind, string>
  > = {};

  public constructor(initialKind: ValueKind) {
    this.kind = initialKind;
  }

  public string(): StringFieldChain {
    this.kind = "string";
    return this;
  }

  public number(): NumberFieldChain {
    this.kind = "number";
    return this;
  }

  public array(): ArrayFieldChain {
    this.kind = "array";
    return this;
  }

  public required(message?: string): this {
    return this.pushRule("required", message);
  }

  public minlength(value: number, message?: string): this {
    return this.pushRule("minlength", message, value);
  }

  public maxlength(value: number, message?: string): this {
    return this.pushRule("maxlength", message, value);
  }

  public pattern(value: string | RegExp, message?: string): this {
    return this.pushRule("pattern", message, value);
  }

  public type(value: string, message?: string): this {
    return this.pushRule("type", message, value);
  }

  public min(value: number, message?: string): this {
    return this.pushRule("min", message, value);
  }

  public max(value: number, message?: string): this {
    return this.pushRule("max", message, value);
  }

  public step(value: number, message?: string): this {
    return this.pushRule("step", message, value);
  }

  public minItems(value: number, message?: string): this {
    return this.pushRule("minItems", message, value);
  }

  public maxItems(value: number, message?: string): this {
    return this.pushRule("maxItems", message, value);
  }

  public custom(validator: CustomRuleValidator, message?: string): this {
    return this.pushRule("custom", message, undefined, validator);
  }

  public getKind(): ValueKind {
    return this.kind;
  }

  public getRules(): RuleConfig[] {
    return [...this.rules];
  }

  public getNativeMessages(): Partial<Record<NativeConstraintKind, string>> {
    return { ...this.nativeMessages };
  }

  private pushRule(
    kind: RuleConfig["kind"],
    message?: string,
    value?: RuleConfig["value"],
    validator?: CustomRuleValidator
  ): this {
    this.rules.push({ kind, message, value, validator });
    if (isNativeConstraintKind(kind) && typeof message === "string") {
      this.nativeMessages[kind] = message;
    }
    return this;
  }
}

function isNativeConstraintKind(
  kind: RuleConfig["kind"]
): kind is NativeConstraintKind {
  return (
    kind === "required" ||
    kind === "minlength" ||
    kind === "maxlength" ||
    kind === "pattern" ||
    kind === "type" ||
    kind === "min" ||
    kind === "max" ||
    kind === "step"
  );
}
