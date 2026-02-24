import { FieldConfigurator } from "./field";
import type { FieldBuilder, FormValidator, FormValidatorErrors } from "../types";

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

class FormValidatorImpl implements FormValidator {
  private readonly formElement: HTMLFormElement;

  private readonly fields = new Map<string, FieldConfigurator>();

  private readonly errors: FormValidatorErrors = {};

  private readonly submitHandler = (event: SubmitEvent): void => {
    if (!this.validate()) {
      event.preventDefault();
    }
  };

  public constructor(formElement: HTMLFormElement) {
    this.formElement = formElement;
    this.formElement.addEventListener("submit", this.submitHandler);
  }

  public field(name: string): FieldBuilder {
    const fieldName = name.trim();
    let field = this.fields.get(fieldName);

    if (!field) {
      field = new FieldConfigurator(fieldName);
      this.fields.set(fieldName, field);
    }

    return field;
  }

  public validate(): boolean {
    this.clearErrors();
    let valid = true;

    for (const [fieldName, field] of this.fields.entries()) {
      const rules = field.getRules();
      void rules;
      void field.getKind();

      const controls = this.findControls(fieldName);
      if (controls.length === 0) {
        continue;
      }

      const firstControl = controls[0];
      if (!firstControl.checkValidity()) {
        valid = false;
        const message = firstControl.validationMessage || "Некорректное значение";
        this.errors[fieldName] = [message];
        this.renderError(fieldName, message);
      }
    }

    return valid;
  }

  public getErrors(): FormValidatorErrors {
    return { ...this.errors };
  }

  public destroy(): void {
    this.formElement.removeEventListener("submit", this.submitHandler);
    this.clearErrors();
  }

  private findControls(name: string): FormControl[] {
    return Array.from(this.formElement.elements).filter(
      (element): element is FormControl =>
        isFormControl(element) && element.name === name,
    );
  }

  private clearErrors(): void {
    for (const key of Object.keys(this.errors)) {
      delete this.errors[key];
    }

    for (const node of this.formElement.querySelectorAll<HTMLElement>("[data-error-for]")) {
      node.textContent = "";
    }
  }

  private renderError(name: string, message: string): void {
    const container = this.formElement.querySelector<HTMLElement>(
      `[data-error-for="${name}"]`,
    );

    if (container) {
      container.textContent = message;
    }
  }
}

function isFormControl(element: Element): element is FormControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

export function form(formElement: HTMLFormElement): FormValidator {
  return new FormValidatorImpl(formElement);
}
