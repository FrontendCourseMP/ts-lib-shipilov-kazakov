import type {
  ArrayFieldChain,
  FieldBuilder,
  NumberFieldChain,
  RuleConfig,
  StringFieldChain,
  ValueKind,
} from "../types";

export class FieldConfigurator
  implements FieldBuilder, StringFieldChain, NumberFieldChain, ArrayFieldChain
{
  private readonly name: string;

  private kind: ValueKind = "string";

  private readonly rules: RuleConfig[] = [];

  public constructor(name: string) {
    this.name = name;
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

  public custom(message?: string): this {
    return this.pushRule("custom", message);
  }

  public getName(): string {
    return this.name;
  }

  public getKind(): ValueKind {
    return this.kind;
  }

  public getRules(): RuleConfig[] {
    return [...this.rules];
  }

  private pushRule(
    kind: RuleConfig["kind"],
    message?: string,
    value?: RuleConfig["value"],
  ): this {
    this.rules.push({ kind, message, value });
    return this;
  }
}
