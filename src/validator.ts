import type {
  CustomRuleContext,
  FieldBuilder,
  FieldKind,
  FieldValue,
  FormControlElement,
  FormValidator,
  NativeConstraintKind,
  ValidationKind,
  ValidationRule,
} from "./types/types";

interface FieldConfig {
  kind?: FieldKind;
  messages: Partial<Record<NativeConstraintKind, string>>;
  name: string;
  rules: ValidationRule[];
}

const NATIVE_KINDS: NativeConstraintKind[] = [
  "required",
  "minlength",
  "maxlength",
  "pattern",
  "type",
  "min",
  "max",
  "step",
];

class FieldBuilderImpl implements FieldBuilder {
  private readonly config: FieldConfig;

  public constructor(config: FieldConfig) {
    this.config = config;
  }

  public string(): FieldBuilder {
    this.config.kind = "string";
    return this;
  }

  public number(): FieldBuilder {
    this.config.kind = "number";
    return this;
  }

  public array(): FieldBuilder {
    this.config.kind = "array";
    return this;
  }

  public required(message?: string): FieldBuilder {
    return this.addRule({ kind: "required", message });
  }

  public minlength(length: number, message?: string): FieldBuilder {
    return this.addRule({ kind: "minlength", message, value: length });
  }

  public maxlength(length: number, message?: string): FieldBuilder {
    return this.addRule({ kind: "maxlength", message, value: length });
  }

  public pattern(pattern: RegExp | string, message?: string): FieldBuilder {
    const preparedPattern =
      typeof pattern === "string" ? new RegExp(pattern) : pattern;
    return this.addRule({ kind: "pattern", message, value: preparedPattern });
  }

  public type(inputType: string, message?: string): FieldBuilder {
    return this.addRule({ kind: "type", message, value: inputType });
  }

  public min(value: number, message?: string): FieldBuilder {
    return this.addRule({ kind: "min", message, value });
  }

  public max(value: number, message?: string): FieldBuilder {
    return this.addRule({ kind: "max", message, value });
  }

  public step(value: number, message?: string): FieldBuilder {
    return this.addRule({ kind: "step", message, value });
  }

  public minItems(count: number, message?: string): FieldBuilder {
    return this.addRule({ kind: "minItems", message, value: count });
  }

  public maxItems(count: number, message?: string): FieldBuilder {
    return this.addRule({ kind: "maxItems", message, value: count });
  }

  public custom(
    validator: (context: CustomRuleContext) => boolean,
    message?: string,
  ): FieldBuilder {
    return this.addRule({ kind: "custom", message, validator });
  }

  private addRule(rule: ValidationRule): FieldBuilder {
    this.config.rules.push(rule);
    if (isNativeConstraintKind(rule.kind) && typeof rule.message === "string") {
      this.config.messages[rule.kind] = rule.message;
    }
    return this;
  }
}

class FormValidatorImpl implements FormValidator {
  private readonly formElement: HTMLFormElement;

  private readonly fieldConfigs = new Map<string, FieldConfig>();

  private errors: Record<string, string[]> = {};

  private readonly submitListener = (event: SubmitEvent): void => {
    const isValid = this.validate();
    if (!isValid) {
      event.preventDefault();
    }
  };

  public constructor(formElement: HTMLFormElement) {
    this.formElement = formElement;
    this.formElement.noValidate = true;
    this.formElement.addEventListener("submit", this.submitListener);
  }

  public field(name: string): FieldBuilder {
    const fieldName = name.trim();
    let config = this.fieldConfigs.get(fieldName);

    if (!config) {
      config = {
        messages: {},
        name: fieldName,
        rules: [],
      };
      this.fieldConfigs.set(fieldName, config);
    }

    return new FieldBuilderImpl(config);
  }

  public validate(): boolean {
    this.clearRenderedErrors();
    this.errors = {};

    let isValid = true;

    for (const name of this.collectFieldNames()) {
      const fieldErrors = this.validateField(name);
      if (fieldErrors.length === 0) {
        continue;
      }

      isValid = false;
      this.errors[name] = fieldErrors;

      const controls = this.getControlsByName(name);
      this.renderError(name, controls, fieldErrors[0]);
    }

    return isValid;
  }

  public getErrors(): Record<string, string[]> {
    return Object.fromEntries(
      Object.entries(this.errors).map(([name, messages]) => [name, [...messages]]),
    );
  }

  public destroy(): void {
    this.formElement.removeEventListener("submit", this.submitListener);
    this.clearRenderedErrors();
    this.errors = {};
  }

  private collectFieldNames(): string[] {
    const fieldNames = new Set<string>(this.fieldConfigs.keys());

    for (const element of Array.from(this.formElement.elements)) {
      if (!isFormControlElement(element) || element.name.trim() === "") {
        continue;
      }
      fieldNames.add(element.name);
    }

    return [...fieldNames];
  }

  private validateField(name: string): string[] {
    const controls = this.getControlsByName(name);
    const config = this.fieldConfigs.get(name);

    if (controls.length === 0) {
      if (config) {
        return [`Поле "${name}" не найдено в форме.`];
      }
      return [];
    }

    const nativeError = this.checkNativeConstraints(controls, config?.messages ?? {});
    if (nativeError) {
      return [nativeError];
    }

    if (!config) {
      return [];
    }

    const fieldKind = config.kind ?? inferFieldKind(controls);
    const value = readFieldValue(controls, fieldKind);

    for (const rule of config.rules) {
      const context: CustomRuleContext = {
        controls,
        form: this.formElement,
        name,
        value,
      };
      const passed = evaluateRule(rule, context);
      if (passed) {
        continue;
      }
      return [rule.message ?? getDefaultRuleMessage(rule)];
    }

    return [];
  }

  private getControlsByName(name: string): FormControlElement[] {
    return Array.from(this.formElement.elements).filter(
      (element): element is FormControlElement =>
        isFormControlElement(element) && element.name === name,
    );
  }

  private checkNativeConstraints(
    controls: FormControlElement[],
    messages: Partial<Record<NativeConstraintKind, string>>,
  ): string | null {
    for (const control of controls) {
      if (!control.willValidate || control.checkValidity()) {
        continue;
      }

      const violationKind = getNativeViolationKind(control.validity);
      if (violationKind && messages[violationKind]) {
        return messages[violationKind];
      }

      return control.validationMessage || "Некорректное значение поля.";
    }

    return null;
  }

  private clearRenderedErrors(): void {
    for (const control of Array.from(this.formElement.elements)) {
      if (isFormControlElement(control)) {
        control.removeAttribute("aria-invalid");
      }
    }

    for (const element of Array.from(
      this.formElement.querySelectorAll<HTMLElement>("[data-ts-val-error-for]"),
    )) {
      element.remove();
    }
  }

  private renderError(
    name: string,
    controls: FormControlElement[],
    message: string,
  ): void {
    if (controls.length === 0) {
      const fallbackNode = document.createElement("p");
      fallbackNode.className = "ts-val-error";
      fallbackNode.dataset.tsValErrorFor = name;
      fallbackNode.setAttribute("role", "alert");
      fallbackNode.setAttribute("aria-live", "assertive");
      fallbackNode.textContent = message;
      this.formElement.append(fallbackNode);
      return;
    }

    for (const control of controls) {
      control.setAttribute("aria-invalid", "true");
    }

    const anchor = controls[controls.length - 1];
    const errorNode = document.createElement("p");
    errorNode.className = "ts-val-error";
    errorNode.dataset.tsValErrorFor = name;
    errorNode.setAttribute("role", "alert");
    errorNode.setAttribute("aria-live", "assertive");
    errorNode.textContent = message;
    anchor.insertAdjacentElement("afterend", errorNode);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const URL_PATTERN = /^(https?:\/\/)?[^\s/$.?#].[^\s]*$/i;

function evaluateRule(rule: ValidationRule, context: CustomRuleContext): boolean {
  const value = context.value;

  if (rule.kind === "required") {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    return typeof value === "string" && value.trim() !== "";
  }

  if (rule.kind === "minlength") {
    return typeof value === "string" && value.length >= Number(rule.value);
  }

  if (rule.kind === "maxlength") {
    return typeof value === "string" && value.length <= Number(rule.value);
  }

  if (rule.kind === "pattern") {
    return typeof value === "string" && asRegExp(rule.value).test(value);
  }

  if (rule.kind === "type") {
    return (
      typeof value === "string" &&
      value.length > 0 &&
      checkValueByInputType(String(rule.value), value)
    );
  }

  if (rule.kind === "min") {
    return typeof value === "number" && value >= Number(rule.value);
  }

  if (rule.kind === "max") {
    return typeof value === "number" && value <= Number(rule.value);
  }

  if (rule.kind === "step") {
    if (typeof value !== "number") {
      return false;
    }
    const step = Number(rule.value);
    return Number.isFinite(step) && step > 0 && Number.isInteger(value / step);
  }

  if (rule.kind === "minItems") {
    return Array.isArray(value) && value.length >= Number(rule.value);
  }

  if (rule.kind === "maxItems") {
    return Array.isArray(value) && value.length <= Number(rule.value);
  }

  if (rule.kind === "custom") {
    if (!rule.validator) {
      return true;
    }
    return rule.validator(context);
  }

  return true;
}

function asRegExp(source: ValidationRule["value"]): RegExp {
  if (source instanceof RegExp) {
    return source;
  }
  return new RegExp(String(source));
}

function readFieldValue(
  controls: FormControlElement[],
  fieldKind: FieldKind,
): FieldValue {
  if (fieldKind === "array") {
    return readArrayValue(controls);
  }

  const firstControl = controls[0];
  if (!firstControl) {
    return null;
  }

  if (fieldKind === "number") {
    const rawValue = readStringValue(controls);
    if (rawValue.trim() === "") {
      return null;
    }
    const parsedValue = Number(rawValue);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  return readStringValue(controls);
}

function readArrayValue(controls: FormControlElement[]): string[] {
  const firstControl = controls[0];
  if (!firstControl) {
    return [];
  }

  if (firstControl instanceof HTMLSelectElement && firstControl.multiple) {
    return Array.from(firstControl.selectedOptions).map((option) => option.value);
  }

  const checkboxOrRadio = controls.filter(
    (control): control is HTMLInputElement =>
      control instanceof HTMLInputElement &&
      (control.type === "checkbox" || control.type === "radio"),
  );

  if (checkboxOrRadio.length > 0) {
    return checkboxOrRadio
      .filter((control) => control.checked)
      .map((control) => control.value);
  }

  const values = controls.map((control) => control.value).filter((value) => value !== "");
  return values;
}

function readStringValue(controls: FormControlElement[]): string {
  const firstControl = controls[0];
  if (!firstControl) {
    return "";
  }

  if (firstControl instanceof HTMLSelectElement && firstControl.multiple) {
    return firstControl.selectedOptions[0]?.value ?? "";
  }

  const checkboxOrRadio = controls.filter(
    (control): control is HTMLInputElement =>
      control instanceof HTMLInputElement &&
      (control.type === "checkbox" || control.type === "radio"),
  );

  if (checkboxOrRadio.length > 0) {
    return checkboxOrRadio.find((control) => control.checked)?.value ?? "";
  }

  return firstControl.value;
}

function inferFieldKind(controls: FormControlElement[]): FieldKind {
  const firstControl = controls[0];
  if (!firstControl) {
    return "string";
  }

  if (firstControl instanceof HTMLSelectElement && firstControl.multiple) {
    return "array";
  }

  if (firstControl instanceof HTMLInputElement) {
    if (firstControl.type === "number" || firstControl.type === "range") {
      return "number";
    }

    if (firstControl.type === "checkbox") {
      return controls.length > 1 ? "array" : "string";
    }

    if (firstControl.type === "radio") {
      return controls.length > 1 ? "array" : "string";
    }
  }

  return "string";
}

function getNativeViolationKind(validity: ValidityState): NativeConstraintKind | null {
  if (validity.valueMissing) {
    return "required";
  }

  if (validity.tooShort) {
    return "minlength";
  }

  if (validity.tooLong) {
    return "maxlength";
  }

  if (validity.patternMismatch) {
    return "pattern";
  }

  if (validity.typeMismatch || validity.badInput) {
    return "type";
  }

  if (validity.rangeUnderflow) {
    return "min";
  }

  if (validity.rangeOverflow) {
    return "max";
  }

  if (validity.stepMismatch) {
    return "step";
  }

  return null;
}

function checkValueByInputType(inputType: string, value: string): boolean {
  if (inputType === "email") {
    return EMAIL_PATTERN.test(value);
  }

  if (inputType === "url") {
    return URL_PATTERN.test(value);
  }

  const probe = document.createElement("input");
  probe.type = inputType;
  probe.value = value;
  return probe.checkValidity();
}

function getDefaultRuleMessage(rule: ValidationRule): string {
  if (rule.kind === "required") {
    return "Поле обязательно для заполнения.";
  }
  if (rule.kind === "minlength") {
    return `Минимальная длина: ${rule.value}.`;
  }
  if (rule.kind === "maxlength") {
    return `Максимальная длина: ${rule.value}.`;
  }
  if (rule.kind === "pattern") {
    return "Значение не соответствует шаблону.";
  }
  if (rule.kind === "type") {
    return `Ожидается тип: ${rule.value}.`;
  }
  if (rule.kind === "min") {
    return `Минимальное значение: ${rule.value}.`;
  }
  if (rule.kind === "max") {
    return `Максимальное значение: ${rule.value}.`;
  }
  if (rule.kind === "step") {
    return `Значение должно быть кратно шагу ${rule.value}.`;
  }
  if (rule.kind === "minItems") {
    return `Минимум элементов: ${rule.value}.`;
  }
  if (rule.kind === "maxItems") {
    return `Максимум элементов: ${rule.value}.`;
  }
  return "Проверка не пройдена.";
}

function isNativeConstraintKind(kind: ValidationKind): kind is NativeConstraintKind {
  return NATIVE_KINDS.includes(kind as NativeConstraintKind);
}

function isFormControlElement(element: Element): element is FormControlElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

export function form(formElement: HTMLFormElement): FormValidator {
  return new FormValidatorImpl(formElement);
}
