import { FieldConfigurator } from "./field";
import type {
  FieldBuilder,
  FieldValue,
  FormControl,
  FormOptions,
  FormValidator,
  NativeConstraintKind,
  RuleConfig,
  ValidationErrors,
  ValidationResult,
  ValueKind,
} from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^(https?:\/\/)?[^\s/$.?#].[^\s]*$/i;

class FormValidatorImpl implements FormValidator {
  private readonly formElement: HTMLFormElement;

  private readonly bindOnSubmit: boolean;

  private readonly fields = new Map<string, FieldConfigurator>();

  private controlsByName = new Map<string, FormControl[]>();

  private containersByName = new Map<string, HTMLElement>();

  private errors: ValidationErrors = {};

  private readonly submitHandler = (event: SubmitEvent): void => {
    if (!this.validate().valid) {
      event.preventDefault();
    }
  };

  public constructor(formElement: HTMLFormElement, options: FormOptions = {}) {
    this.formElement = formElement;
    this.bindOnSubmit = options.bindOnSubmit !== false;
    this.formElement.noValidate = true;

    this.collectFormState();
    this.assertHasFields();
    this.ensureContainersForKnownFields();

    if (this.bindOnSubmit) {
      this.formElement.addEventListener("submit", this.submitHandler);
    }
  }

  public field(name: string): FieldBuilder {
    const fieldName = name.trim();
    if (fieldName === "") {
      throw new Error("Имя поля не может быть пустым.");
    }

    this.collectFormState();
    const controls = this.controlsByName.get(fieldName);
    if (!controls || controls.length === 0) {
      throw new Error(`Поле "${fieldName}" не найдено в форме.`);
    }

    this.ensureErrorContainer(fieldName, controls);
    let field = this.fields.get(fieldName);

    if (!field) {
      field = new FieldConfigurator(inferFieldKind(controls));
      this.fields.set(fieldName, field);
    }

    return field;
  }

  public validate(): ValidationResult {
    this.collectFormState();
    this.clearErrors();

    let valid = true;

    const fieldNames = new Set<string>(this.controlsByName.keys());
    for (const fieldName of this.fields.keys()) {
      fieldNames.add(fieldName);
    }

    for (const fieldName of fieldNames) {
      const controls = this.controlsByName.get(fieldName) ?? [];
      const field = this.fields.get(fieldName);
      if (controls.length === 0 && field) {
        valid = false;
        const missingFieldMessage = `Поле "${fieldName}" не найдено в форме.`;
        this.pushError(fieldName, missingFieldMessage);
        continue;
      }

      if (controls.length === 0) {
        continue;
      }

      const fieldMessage = this.validateField(fieldName, controls, field);
      if (!fieldMessage) {
        continue;
      }

      valid = false;
      this.pushError(fieldName, fieldMessage);
      const container = this.ensureErrorContainer(fieldName, controls);
      this.renderError(controls, container, fieldMessage);
    }

    return {
      valid,
      errors: this.getErrors(),
    };
  }

  public getErrors(): ValidationErrors {
    return { ...this.errors };
  }

  public destroy(): void {
    if (this.bindOnSubmit) {
      this.formElement.removeEventListener("submit", this.submitHandler);
    }
    this.clearErrors();
  }

  private collectFormState(): void {
    const controlsByName = new Map<string, FormControl[]>();

    for (const element of Array.from(this.formElement.elements)) {
      if (!isFormControl(element)) {
        continue;
      }

      const name = element.name.trim();
      if (name === "") {
        continue;
      }

      const controls = controlsByName.get(name);
      if (controls) {
        controls.push(element);
      } else {
        controlsByName.set(name, [element]);
      }
    }

    this.controlsByName = controlsByName;
    this.refreshContainers();
  }

  private refreshContainers(): void {
    const containers = new Map<string, HTMLElement>();
    const nodes = Array.from(
      this.formElement.querySelectorAll<HTMLElement>(
        "[data-error-for], [data-ts-val-error-for]"
      )
    );

    for (const node of nodes) {
      const name = readContainerName(node);
      if (name === null || containers.has(name)) {
        continue;
      }

      containers.set(name, node);
    }

    this.containersByName = containers;
  }

  private assertHasFields(): void {
    if (this.controlsByName.size === 0) {
      throw new Error("В форме нет полей с атрибутом name.");
    }
  }

  private ensureContainersForKnownFields(): void {
    for (const [name, controls] of this.controlsByName) {
      this.ensureErrorContainer(name, controls);
    }
  }

  private ensureErrorContainer(
    name: string,
    controls: FormControl[]
  ): HTMLElement {
    const existingContainer = this.containersByName.get(name);
    if (existingContainer && existingContainer.isConnected) {
      return existingContainer;
    }

    const anchor = controls[controls.length - 1];
    const container = document.createElement("p");
    container.className = "ts-val-error";
    container.dataset.errorFor = name;
    container.dataset.tsValErrorFor = name;
    container.setAttribute("role", "alert");
    container.setAttribute("aria-live", "assertive");
    anchor.insertAdjacentElement("afterend", container);

    this.containersByName.set(name, container);
    return container;
  }

  private validateField(
    name: string,
    controls: FormControl[],
    config?: FieldConfigurator
  ): string | null {
    const nativeError = this.validateNativeConstraints(
      controls,
      config?.getNativeMessages() ?? {}
    );

    if (nativeError) {
      return nativeError;
    }

    if (!config) {
      return null;
    }

    const value = readFieldValue(controls, config.getKind());
    for (const rule of config.getRules()) {
      const passed = evaluateRule(rule, {
        controls,
        form: this.formElement,
        name,
        value,
      });

      if (passed) {
        continue;
      }

      return rule.message ?? getDefaultRuleMessage(rule);
    }

    return null;
  }

  private validateNativeConstraints(
    controls: FormControl[],
    messageOverrides: Partial<Record<NativeConstraintKind, string>>
  ): string | null {
    for (const control of controls) {
      if (control.willValidate) {
        control.setCustomValidity("");
      }

      if (!control.willValidate || control.checkValidity()) {
        continue;
      }

      const violation = getNativeViolationKind(control.validity);
      if (violation && messageOverrides[violation]) {
        const message = messageOverrides[violation];
        control.setCustomValidity(message);
        return control.validationMessage || message;
      }

      return control.validationMessage || "Некорректное значение поля.";
    }

    return null;
  }

  private pushError(name: string, message: string): void {
    this.errors[name] = message;
  }

  private clearErrors(): void {
    this.errors = {};

    for (const controls of this.controlsByName.values()) {
      for (const control of controls) {
        if (control.willValidate) {
          control.setCustomValidity("");
        }
        control.removeAttribute("aria-invalid");
      }
    }

    for (const container of this.containersByName.values()) {
      container.textContent = "";
    }
  }

  private renderError(
    controls: FormControl[],
    container: HTMLElement,
    message: string
  ): void {
    for (const control of controls) {
      control.setAttribute("aria-invalid", "true");
      if (control.willValidate) {
        control.setCustomValidity(message);
      }
    }

    container.textContent = message;
  }
}

function isFormControl(element: Element): element is FormControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function readContainerName(node: HTMLElement): string | null {
  const name =
    node.dataset.errorFor?.trim() ?? node.dataset.tsValErrorFor?.trim() ?? "";
  return name === "" ? null : name;
}

function evaluateRule(
  rule: RuleConfig,
  context: {
    name: string;
    form: HTMLFormElement;
    controls: FormControl[];
    value: FieldValue;
  }
): boolean {
  const { value } = context;

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
    return typeof value === "string" && toRegExp(rule.value).test(value);
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

function readFieldValue(controls: FormControl[], kind: ValueKind): FieldValue {
  if (kind === "array") {
    return readArrayValue(controls);
  }

  if (kind === "number") {
    const rawValue = readStringValue(controls);
    if (rawValue.trim() === "") {
      return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  return readStringValue(controls);
}

function readArrayValue(controls: FormControl[]): string[] {
  const firstControl = controls[0];
  if (!firstControl) {
    return [];
  }

  if (firstControl instanceof HTMLSelectElement && firstControl.multiple) {
    return Array.from(firstControl.selectedOptions).map(
      (option) => option.value
    );
  }

  const checkableControls = controls.filter(
    (control): control is HTMLInputElement =>
      control instanceof HTMLInputElement &&
      (control.type === "checkbox" || control.type === "radio")
  );

  if (checkableControls.length > 0) {
    return checkableControls
      .filter((control) => control.checked)
      .map((control) => control.value);
  }

  return controls
    .map((control) => control.value)
    .filter((value) => value !== "");
}

function readStringValue(controls: FormControl[]): string {
  const firstControl = controls[0];
  if (!firstControl) {
    return "";
  }

  if (firstControl instanceof HTMLSelectElement && firstControl.multiple) {
    return firstControl.selectedOptions[0]?.value ?? "";
  }

  const checkableControls = controls.filter(
    (control): control is HTMLInputElement =>
      control instanceof HTMLInputElement &&
      (control.type === "checkbox" || control.type === "radio")
  );

  if (checkableControls.length > 0) {
    return checkableControls.find((control) => control.checked)?.value ?? "";
  }

  return firstControl.value;
}

function inferFieldKind(controls: FormControl[]): ValueKind {
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

    if (firstControl.type === "checkbox" || firstControl.type === "radio") {
      return controls.length > 1 ? "array" : "string";
    }
  }

  return "string";
}

function getNativeViolationKind(
  validity: ValidityState
): NativeConstraintKind | null {
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

function toRegExp(source: RuleConfig["value"]): RegExp {
  if (source instanceof RegExp) {
    return source;
  }

  return new RegExp(String(source));
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

function getDefaultRuleMessage(rule: RuleConfig): string {
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

export function form(
  formElement: HTMLFormElement,
  options: FormOptions = {}
): FormValidator {
  return new FormValidatorImpl(formElement, options);
}
