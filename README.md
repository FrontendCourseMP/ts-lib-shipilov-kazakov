# Документация по библиотеке валидации `ts-val`
Авторы: Казаков Дмитрий, Шипилов Сергей
## Описание

`ts-val` - библиотека для валидации HTML-форм на TypeScript.

Поддерживает:

- fluent API: `field(name).string()/number()/array()...`
- native Constraint Validation API (`checkValidity`, `validity`, `validationMessage`)
- кастомные сообщения ошибок из JS-цепочек
- вывод ошибок в DOM через контейнеры `data-error-for` / `data-ts-val-error-for`
- ручной запуск `validate()` и автопривязку к `submit` (можно отключить)

## Требования

- TypeScript 5.9+
- Node.js 20+ (для разработки и тестов)
- Современный браузер с поддержкой ES2022

## Установка

### Для разработки

```bash
npm install
```

### Сборка библиотеки (пакетные артефакты)

```bash
npm run build:package
```

После сборки entry-файлы библиотеки находятся в `dist-package/lib`.

## Быстрый старт

### Пример использования

```ts
import * as n from "ts-val";

const formElement = document.querySelector<HTMLFormElement>("#signup-form");

if (formElement) {
  const validator = n.form(formElement);

  validator
    .field("username")
    .string()
    .required("Введите имя")
    .minlength(2, "Минимум 2 символа")
    .maxlength(30, "Максимум 30 символов");

  validator
    .field("email")
    .string()
    .required("Введите email")
    .type("email", "Некорректный email");

  const result = validator.validate();
  console.log(result.valid, result.errors);
}
```

### Минимальная HTML-структура

```html
<form id="signup-form">
  <label>
    Username
    <input name="username" required minlength="2" />
  </label>
  <p data-error-for="username"></p>

  <label>
    Email
    <input name="email" type="email" required />
  </label>
  <p data-ts-val-error-for="email"></p>

  <button type="submit">Submit</button>
</form>
```

Примечания:

- поле должно иметь атрибут `name`
- если контейнер ошибки не задан, библиотека создаст его автоматически (`<p class="ts-val-error"...>`)

## API

### `form(formElement, options?)`

Создает экземпляр валидатора.

Параметры:

- `formElement: HTMLFormElement`
- `options?: FormOptions`
- `bindOnSubmit?: boolean` (по умолчанию `true`)

Возвращает: `FormValidator`.

### `validator.field(name)`

Регистрирует/получает конфиг поля и возвращает типизированную цепочку.

Базовый выбор типа:

- `.string()`
- `.number()`
- `.array()`

### Правила для `string()`

- `.required(message?)`
- `.minlength(value, message?)`
- `.maxlength(value, message?)`
- `.pattern(value, message?)`
- `.type(value, message?)`
- `.custom(validator, message?)`

### Правила для `number()`

- `.required(message?)`
- `.min(value, message?)`
- `.max(value, message?)`
- `.step(value, message?)`
- `.custom(validator, message?)`

### Правила для `array()`

- `.required(message?)`
- `.minItems(value, message?)`
- `.maxItems(value, message?)`
- `.custom(validator, message?)`

### `validator.validate()`

Запускает валидацию всех полей формы.

Возвращает:

```ts
{
  valid: boolean;
  errors: Record<string, string[]>;
}
```

Поведение:

- очищает прошлые ошибки (`aria-invalid`, контейнеры, `setCustomValidity("")`)
- сначала проверяет native-ограничения
- затем JS-правила из цепочек
- ставит `aria-invalid="true"` и рендерит текст ошибки в контейнер
- синхронизирует сообщение через `setCustomValidity(message)`

### `validator.getErrors()`

Возвращает текущие ошибки в формате `Record<string, string[]>`.

### `validator.destroy()`

Снимает submit-listener (если был включен) и очищает состояние ошибок.

## Типы

Публичные типы экспортируются из `src/types/index.ts`:

- `FormValidator`, `FormOptions`, `ValidationResult`, `ValidationErrors`
- `FieldBuilder`, `StringFieldChain`, `NumberFieldChain`, `ArrayFieldChain`
- `RuleKind`, `RuleConfig`, `ValueKind`, `FieldValue`
- `CustomRuleContext`, `CustomRuleValidator`, `NativeConstraintKind`, `FormControl`

Пример custom-правила:

```ts
validator.field("username").string().custom(({ value }) => {
  return typeof value === "string" && value.trim().length >= 2;
}, "Минимум 2 символа");
```

## Тестирование

Проект использует `Vitest` + `jsdom`.

Запуск:

```bash
npm test -- --run
```

Текущий набор тестов (5 кейсов):

- happy path (валидная форма)
- `required` на пустом поле
- `minlength` на коротком значении
- `pattern` mismatch
- `array/minItems` для группы checkbox

## Структура проекта

```text
src/
  lib/
    index.ts
    form.ts
    field.ts
  types/
    index.ts
    form.ts
    field.ts
  tests/
    form-validator.test.ts
```

## Соответствие требованиям

- Есть точка входа `form(formElement: HTMLFormElement)`.
- Есть API `validator.field(name)` и type chains `string/number/array`.
- Используется Constraint Validation API браузера.
- Поддержаны кастомные сообщения ошибок.
- `validate()` возвращает объект результата `{ valid, errors }`.
- Есть автопривязка на `submit` и отключение через `bindOnSubmit: false`.
- Типы API и результата выделены и экспортируются отдельно.
- Есть unit-тесты с DOM-окружением (`jsdom`).
