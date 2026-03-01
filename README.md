# ts-val

Библиотека валидации HTML-форм на TypeScript.

Авторы:
- Шипилов Сергей
- Казаков Дмитрий

## Кратко

`ts-val` поддерживает:
- точку входа `form(formElement, options?)`
- API `validator.field(name)`
- цепочки `string()`, `number()`, `array()`
- native Constraint Validation API
- кастомные сообщения ошибок
- `validate()` с результатом `{ valid, errors }`
- вывод ошибок в DOM и submit-hook

## Запуск проекта

```bash
npm install
npm run build
npm run build:package
npm test -- --run
npm run lint
```

`build:package` собирает библиотеку в `dist-package/lib`.

## Пример использования

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
  if (!result.valid) {
    // ошибки уже выведены в DOM
  }
}
```

## TS: Задачи

- [x] Есть точка входа `form(formElement: HTMLFormElement)`.
- [x] Есть API `validator.field(name)`.
- [x] Есть цепочки `string()`, `number()`, `array()`.
- [x] Поддержаны `required`, `minlength`, `maxlength`, `pattern`, `type`, `min`, `max`, `step`.
- [x] Можно задавать свои сообщения для native и JS-правил.
- [x] `validate()` возвращает объект результата.
- [x] Есть автопроверка на `submit`.
- [x] Ошибки выводятся под полями.
- [x] Публичные типы вынесены в `src/types`.
- [x] Есть unit-тесты на happy path и негативные сценарии.

## TS: Анализ

Что используется из DOM и Constraint Validation API:
- `HTMLFormElement`, `HTMLInputElement`, `HTMLSelectElement`, `HTMLTextAreaElement`
- `form.elements`
- `checkValidity()`
- `validity`
- `validationMessage`
- `setCustomValidity()`
- `addEventListener("submit", ...)`
- `insertAdjacentElement()`, `querySelectorAll()`, `setAttribute()`, `removeAttribute()`

Как работает проверка:
- библиотека собирает контролы формы по `name`
- сначала проверяет native-ограничения через `checkValidity()` и `validity`
- затем применяет JS-правила для `string`, `number`, `array`
- если для native-ошибки задан кастомный текст, он приоритетнее browser message
- текст ошибки дублируется в DOM и в объект результата

Как выводятся ошибки:
- используется контейнер `data-error-for="fieldName"` или он создается автоматически
- на невалидные контролы ставится `aria-invalid="true"`
- через `setCustomValidity(message)` синхронизируется custom message
- перед новой проверкой ошибки и custom validity очищаются

## Библиотеки для сравнения

Оценка по критериям: свежесть, простота, документация, звезды.

| Библиотека | Свежесть | Простота | Документация | Звезды |
|---|---:|---:|---:|---:|
| Zod | 5 | 4 | 5 | 5 |
| Just-Validate | 4 | 5 | 4 | 4 |
| Valibot | 5 | 4 | 4 | 3 |
| Yup | 3 | 5 | 4 | 5 |
| Vest | 4 | 3 | 3 | 2 |

Итог:
- `Zod` и `Just-Validate` были главными ориентирами по удобству API
- для лабораторной реализован свой fluent API, привязанный к HTML-форме

## TS: Типы

Типы лежат в `src/types`.

Основные публичные типы:
- `FormValidator`
- `FormOptions`
- `ValidationResult`
- `ValidationErrors`
- `FieldBuilder`
- `StringFieldChain`
- `NumberFieldChain`
- `ArrayFieldChain`
- `RuleConfig`

Тип результата:

```ts
type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};
```

## TS: Реализация

Структура:
- `src/lib/form.ts` - привязка к форме, submit-hook, native validation, рендер ошибок
- `src/lib/field.ts` - fluent API и конфигурация правил поля
- `src/lib/index.ts` - публичные экспорты
- `src/types/*` - типы библиотеки
- `src/tests/form-validator.test.ts` - unit-тесты

Краткий API:
- `form(formElement, options?)`
- `validator.field(name).string()`
- `validator.field(name).number()`
- `validator.field(name).array()`
- `validator.validate(): ValidationResult`
- `validator.getErrors(): Record<string, string>`
- `validator.destroy(): void`

## Тесты

Покрыты сценарии:
- happy path
- required
- minlength
- pattern
- number: `min`, `step`
- array: `minItems`
- custom validator
- submit-hook
- `destroy()`
- отсутствие полей в форме
- отсутствие контейнера ошибки

Тесты находятся в:
- `src/tests/form-validator.test.ts`
