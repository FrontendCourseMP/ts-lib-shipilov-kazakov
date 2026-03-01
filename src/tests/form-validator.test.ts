// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vitest";

import { form } from "../lib";

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
    `[data-ts-val-error-for="${name}"], [data-error-for="${name}"]`
  );
  return node?.textContent ?? null;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("form validator", () => {
  test("happy path (валидно)", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="username" value="john" />
        <p data-error-for="username"></p>
      </form>
    `);

    const validator = form(formElement);
    validator
      .field("username")
      .string()
      .required("Имя обязательно")
      .minlength(3);

    // Act
    const result = validator.validate();

    // Assert
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(getErrorText("username")).toBe("");
  });

  test("required пусто", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="username" required />
        <p data-error-for="username"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().required("Введите имя");

    // Act
    const result = validator.validate();

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors.username).toBe("Введите имя");
    expect(getErrorText("username")).toBe("Введите имя");
  });

  test("minlength слишком коротко", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="username" value="ab" />
        <p data-error-for="username"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("username").string().minlength(3, "Минимум 3 символа");

    // Act
    const result = validator.validate();

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors.username).toBe("Минимум 3 символа");
    expect(getErrorText("username")).toBe("Минимум 3 символа");
  });

  test("pattern mismatch", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="code" value="abc" />
        <p data-error-for="code"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("code").string().pattern(/^\d+$/, "Только цифры");

    // Act
    const result = validator.validate();

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors.code).toBe("Только цифры");
    expect(getErrorText("code")).toBe("Только цифры");
  });

  test("checkbox array: ни один не выбран", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input type="checkbox" name="tags" value="a" />
        <input type="checkbox" name="tags" value="b" />
        <p data-error-for="tags"></p>
      </form>
    `);

    const validator = form(formElement);
    validator.field("tags").array().minItems(1, "Выберите минимум один");

    // Act
    const result = validator.validate();

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors.tags).toBe("Выберите минимум один");
    expect(getErrorText("tags")).toBe("Выберите минимум один");
  });

  test("number field: min и step", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input type="number" name="age" value="7" />
        <p data-error-for="age"></p>
      </form>
    `);
    const ageInput = formElement.elements.namedItem("age") as HTMLInputElement;
    const validator = form(formElement);
    validator.field("age").number().min(10, "Слишком мало").step(2, "Шаг 2");

    // Act
    const invalidMinResult = validator.validate();
    ageInput.value = "16";
    const validResult = validator.validate();
    ageInput.value = "17";
    const invalidStepResult = validator.validate();

    // Assert
    expect(invalidMinResult.valid).toBe(false);
    expect(invalidMinResult.errors.age).toBe("Слишком мало");
    expect(validResult.valid).toBe(true);
    expect(invalidStepResult.valid).toBe(false);
    expect(invalidStepResult.errors.age).toBe("Шаг 2");
  });

  test("custom validator uses custom message", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="username" value="admin" />
        <p data-error-for="username"></p>
      </form>
    `);
    const validator = form(formElement);
    validator
      .field("username")
      .string()
      .custom(({ value }) => value !== "admin", "Имя admin запрещено");

    // Act
    const result = validator.validate();

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors.username).toBe("Имя admin запрещено");
  });

  test("submit hook blocks invalid form", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="email" type="email" required />
        <p data-error-for="email"></p>
      </form>
    `);
    const validator = form(formElement);
    validator.field("email").string().required("Введите email");
    const submitEvent = new Event("submit", { cancelable: true });

    // Act
    formElement.dispatchEvent(submitEvent);

    // Assert
    expect(submitEvent.defaultPrevented).toBe(true);
  });

  test("destroy removes submit hook", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="email" type="email" required />
        <p data-error-for="email"></p>
      </form>
    `);
    const validator = form(formElement);
    validator.field("email").string().required("Введите email");
    validator.destroy();
    const submitEvent = new Event("submit", { cancelable: true });

    // Act
    formElement.dispatchEvent(submitEvent);

    // Assert
    expect(submitEvent.defaultPrevented).toBe(false);
  });

  test("constructor throws when form has no named fields", () => {
    expect(() => {
      const formElement = createForm(`
        <form>
          <input />
        </form>
      `);

      form(formElement);
    }).toThrow("В форме нет полей с атрибутом name.");
  });

  test("field throws when requested control is missing", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="username" />
        <p data-error-for="username"></p>
      </form>
    `);
    const validator = form(formElement);

    // Act + Assert
    expect(() => validator.field("missing")).toThrow(
      'Поле "missing" не найдено в форме.'
    );
  });

  test("missing error container is created automatically", () => {
    // Arrange
    const formElement = createForm(`
      <form>
        <input name="username" value="" required />
      </form>
    `);
    const validator = form(formElement);
    validator.field("username").string().required("Введите имя");

    // Act
    const result = validator.validate();

    // Assert
    expect(result.valid).toBe(false);
    expect(getErrorText("username")).toBe("Введите имя");
  });
});
