// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vitest";

import { form } from "../main";

function createForm(markup: string): HTMLFormElement {
  document.body.innerHTML = markup;
  const formElement = document.querySelector("form");
  if (!formElement) {
    throw new Error("Form element was not created.");
  }
  return formElement;
}

function getErrorText(name: string): string | null {
  const node = document.querySelector<HTMLElement>(
    `[data-ts-val-error-for="${name}"]`,
  );
  return node?.textContent ?? null;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("form validator", () => {
  test("passes happy path for string field", () => {
    const formElement = createForm(`
      <form>
        <input name="username" required minlength="3" value="john" />
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().required("Имя обязательно").minlength(3);

    expect(validator.validate()).toBe(true);
    expect(validator.getErrors()).toEqual({});
    expect(getErrorText("username")).toBeNull();
  });

  test("uses custom message for native required error", () => {
    const formElement = createForm(`
      <form>
        <input name="username" required />
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().required("Введите имя");

    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().username).toEqual(["Введите имя"]);
    expect(getErrorText("username")).toBe("Введите имя");
  });

  test("fails custom pattern rule when no native pattern is set", () => {
    const formElement = createForm(`
      <form>
        <input name="code" value="abc" />
      </form>
    `);

    const validator = form(formElement);
    validator.field("code").string().pattern(/^\d+$/, "Только цифры");

    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().code).toEqual(["Только цифры"]);
  });

  test("handles number min and step rules", () => {
    const formElement = createForm(`
      <form>
        <input type="number" name="age" value="7" />
      </form>
    `);

    const ageInput = formElement.elements.namedItem("age") as HTMLInputElement;

    const validator = form(formElement);
    validator.field("age").number().min(10, "Слишком мало").step(2, "Шаг 2");

    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().age).toEqual(["Слишком мало"]);

    ageInput.value = "16";
    expect(validator.validate()).toBe(true);

    ageInput.value = "17";
    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().age).toEqual(["Шаг 2"]);
  });

  test("validates checkbox array with minItems and maxItems", () => {
    const formElement = createForm(`
      <form>
        <input type="checkbox" name="tags" value="a" />
        <input type="checkbox" name="tags" value="b" />
      </form>
    `);

    const inputs = Array.from(
      formElement.querySelectorAll<HTMLInputElement>('input[name="tags"]'),
    );

    const validator = form(formElement);
    validator
      .field("tags")
      .array()
      .minItems(1, "Выберите минимум один")
      .maxItems(1, "Можно выбрать только один");

    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().tags).toEqual(["Выберите минимум один"]);

    inputs[0].checked = true;
    expect(validator.validate()).toBe(true);

    inputs[1].checked = true;
    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().tags).toEqual(["Можно выбрать только один"]);
  });

  test("prevents submit when form is invalid and allows when valid", () => {
    const formElement = createForm(`
      <form>
        <input name="email" type="email" required />
      </form>
    `);

    const emailInput = formElement.elements.namedItem("email") as HTMLInputElement;
    const validator = form(formElement);
    validator.field("email").string().required("Email обязателен");

    const invalidSubmit = new Event("submit", { cancelable: true });
    formElement.dispatchEvent(invalidSubmit);
    expect(invalidSubmit.defaultPrevented).toBe(true);

    emailInput.value = "hello@example.com";
    const validSubmit = new Event("submit", { cancelable: true });
    formElement.dispatchEvent(validSubmit);
    expect(validSubmit.defaultPrevented).toBe(false);
  });

  test("validates native constraints even when field is not configured", () => {
    const formElement = createForm(`
      <form>
        <input name="email" type="email" value="not-an-email" />
      </form>
    `);

    const validator = form(formElement);

    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().email.length).toBeGreaterThan(0);
  });

  test("returns an error when configured field does not exist in form", () => {
    const formElement = createForm(`
      <form>
        <input name="username" />
      </form>
    `);

    const validator = form(formElement);
    validator.field("missing").string().required("Поле обязательно");

    expect(validator.validate()).toBe(false);
    expect(validator.getErrors().missing).toEqual([
      'Поле "missing" не найдено в форме.',
    ]);
  });

  test("removes submit hook after destroy", () => {
    const formElement = createForm(`
      <form>
        <input name="username" required />
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().required("Введите имя");
    validator.destroy();

    const submitEvent = new Event("submit", { cancelable: true });
    formElement.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(false);
    expect(validator.getErrors()).toEqual({});
  });
});
