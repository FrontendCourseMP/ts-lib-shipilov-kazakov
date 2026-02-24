# ts-val: библиотека валидации HTML-форм на TypeScript

## TS: Задачи
Реализована библиотека валидации формы с требованиями из ведомости:

- Точка входа `form(formElement: HTMLFormElement)`.
- API `validator.field(name)` для настройки правил по полям.
- Цепочки `string() / number() / array()` и ограничения.
- Поддержка Constraint Validation API:
  `required`, `minlength`, `maxlength`, `pattern`, `type`, `min`, `max`, `step`.
- Кастомные сообщения через JS-цепочки.
- `validate()` + автопроверка на `submit`.
- Вывод ошибок под полями (`<p data-ts-val-error-for="...">`).
- Типы вынесены в `src/types/types.ts`.
- Тесты Vitest: happy path и негативные сценарии.

## TS: Анализ
Ключевая идея: объединить два источника правил.

1. HTML-ограничения (нативные атрибуты поля) через `checkValidity()`/`validity`.
2. Правила из JS-цепочек (`field(...).string().minlength(...).custom(...)`).

Порядок проверки:

1. Сначала native-валидация (если есть ошибка, берётся native message или переопределённое сообщение из цепочки).
2. Затем дополнительные JS-правила.

Так достигается совместимость с браузерным API и расширяемость без потери типизации.

## TS: Типы
Публичные типы находятся в `src/types/types.ts`.

- `FormValidator`: `field`, `validate`, `getErrors`, `destroy`.
- `FieldBuilder`: chain API для всех типов полей.
- `ValidationKind`, `ValidationRule`, `FieldKind`, `FieldValue`.
- `CustomRuleContext` и `CustomValidator` для пользовательских проверок.

Пример типизированного контекста кастомного правила:

```ts
custom(({ value, name, form }) => {
  return typeof value === "string" && value !== form.id && name.length > 0;
}, "Кастомная ошибка");
```

## TS: Реализация
### Структура

- `src/main.ts` - точка входа и re-export API.
- `src/validator.ts` - реализация валидатора.
- `src/types/types.ts` - типы.
- `src/tests/form-validator.test.ts` - тесты.

### Основной сценарий использования

```ts
import { form } from "./src/main";

const formElement = document.querySelector("form");

if (formElement instanceof HTMLFormElement) {
  const validator = form(formElement);

  validator
    .field("username")
    .string()
    .required("Введите имя")
    .minlength(3, "Минимум 3 символа")
    .maxlength(20, "Максимум 20 символов");

  validator
    .field("age")
    .number()
    .required("Укажите возраст")
    .min(18, "Только 18+")
    .step(1, "Возраст должен быть целым");

  validator
    .field("tags")
    .array()
    .minItems(1, "Выберите минимум один тег")
    .maxItems(3, "Можно выбрать максимум 3 тега");

  const ok = validator.validate(); // ручной запуск проверки
  console.log("valid:", ok, validator.getErrors());
}
```

### API (кратко)

- `form(formElement)` -> `FormValidator`
- `validator.field(name)` -> `FieldBuilder`
- `FieldBuilder`:
  - тип поля: `string()`, `number()`, `array()`
  - общие: `required()`, `custom()`
  - string: `minlength()`, `maxlength()`, `pattern()`, `type()`
  - number: `min()`, `max()`, `step()`
  - array: `minItems()`, `maxItems()`
- `validator.validate()` -> `boolean`
- `validator.getErrors()` -> `Record<string, string[]>`
- `validator.destroy()` -> отключение submit-hook и очистка ошибок

### Поведение на submit

При создании валидатора форма автоматически подписывается на `submit`:

- если форма невалидна -> `preventDefault()` и рендер ошибок;
- если валидна -> отправка не блокируется.

## Тесты
Тесты покрывают:

- happy path;
- native required/type;
- кастомные правила pattern/custom;
- number (`min`, `step`);
- array (`minItems`, `maxItems`);
- submit-hook (валидный/невалидный submit);
- ветку отсутствующего поля в конфиге.

Команды:

```bash
npm test -- --run
npm run build
```
