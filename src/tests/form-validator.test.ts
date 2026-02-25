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
    `[data-ts-val-error-for="${name}"], [data-error-for="${name}"]`,
  );
  return node?.textContent ?? null;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("form validator", () => {
  test("happy path (валидно)", () => {
    const formElement = createForm(`
      <form>
        <input name="username" value="john" />
        <p data-error-for="username"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().required("Имя обязательно").minlength(3);

    const result = validator.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(getErrorText("username")).toBe("");
  });

  test("required пусто", () => {
    const formElement = createForm(`
      <form>
        <input name="username" required />
        <p data-error-for="username"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().required("Введите имя");

    const result = validator.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.username).toEqual(["Введите имя"]);
    expect(getErrorText("username")).toBe("Введите имя");
  });

  test("minlength слишком коротко", () => {
    const formElement = createForm(`
      <form>
        <input name="username" value="ab" />
        <p data-error-for="username"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().minlength(3, "Минимум 3 символа");

    const result = validator.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.username).toEqual(["Минимум 3 символа"]);
    expect(getErrorText("username")).toBe("Минимум 3 символа");
  });

  test("pattern mismatch", () => {
    const formElement = createForm(`
      <form>
        <input name="code" value="abc" />
        <p data-error-for="code"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("code").string().pattern(/^\d+$/, "Только цифры");

    const result = validator.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.code).toEqual(["Только цифры"]);
    expect(getErrorText("code")).toBe("Только цифры");
  });

  test("checkbox array: ни один не выбран", () => {
    const formElement = createForm(`
      <form>
        <input type="checkbox" name="tags" value="a" />
        <input type="checkbox" name="tags" value="b" />
        <p data-error-for="tags"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("tags").array().minItems(1, "Выберите минимум один");

    const result = validator.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.tags).toEqual(["Выберите минимум один"]);
    expect(getErrorText("tags")).toBe("Выберите минимум один");
  });
});
