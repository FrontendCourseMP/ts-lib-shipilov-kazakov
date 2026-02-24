# ts-val: библиотека валидации HTML-форм на TypeScript

## TS: Задачи (чеклист требований)

- [x] Есть точка входа: `form(formElement: HTMLFormElement)`.
- [x] Есть API для полей: `validator.field(name)`.
- [x] Есть цепочки типов: `string()`, `number()`, `array()`.
- [x] Поддержаны native-ограничения браузера: `required`, `minlength`, `maxlength`, `pattern`, `type`, `min`, `max`, `step`.
- [x] Можно задавать свои сообщения об ошибках в цепочке.
- [x] Есть ручной запуск проверки: `validate()`.
- [x] Есть автопроверка на `submit`.
- [x] Ошибки выводятся в DOM под полем через `<p data-ts-val-error-for="...">`.
- [x] Типы вынесены в `src/types/types.ts`.
- [x] Есть тесты на успешные и неуспешные сценарии.

## TS: Анализ

Что используем из DOM:

- `HTMLFormElement`, `HTMLInputElement`, `HTMLSelectElement`, `HTMLTextAreaElement`.
- `form.elements` для поиска полей по `name`.
- `addEventListener("submit", ...)` и `preventDefault()` для блокировки отправки при ошибках.
- `checkValidity()`, `validity`, `validationMessage` для native-валидации.
- `querySelectorAll`, `createElement`, `insertAdjacentElement`, `setAttribute`, `removeAttribute` для вывода/очистки ошибок.

Как читаем атрибуты и ограничения:

- Для native-правил вручную атрибуты не парсим, это делает сам браузер через `checkValidity()`.
- Для собственных правил читаем текущее значение поля (`value`, `checked`, `selectedOptions`) и проверяем уже в TypeScript.
- Для `type` используем проверку через временный `<input>` + `checkValidity()`, а для `email/url` есть отдельные шаблоны.

Как выбираем сообщение об ошибке:

1. Если упало native-правило и для него задано сообщение в цепочке, берем его.
2. Иначе берем `control.validationMessage` от браузера.
3. Если native-проверка прошла, запускаем JS-правила (`minItems`, `custom` и т.д.).
4. Если для JS-правила есть свой текст, берем его, иначе берем дефолтный.

Как выводим ошибки:

- Полю ставим `aria-invalid="true"`.
- Создаем `<p class="ts-val-error" data-ts-val-error-for="имя_поля">...</p>`.
- Добавляем `role="alert"` и `aria-live="assertive"`.
- Вставляем ошибку сразу после последнего контрола поля.
- Перед новой проверкой удаляем старые ошибки и сбрасываем `aria-invalid`.

## Отдельный блок: 5 библиотек валидации форм + рейтинг

Оценка по 5-балльной шкале.  
Свежесть и звезды - по GitHub, данные на **24 февраля 2026**.

| # | Библиотека | Свежесть | Простота | Документация | Звезды GitHub | Итог |
|---|---|---:|---:|---:|---:|---:|
| 1 | [Zod](https://github.com/colinhacks/zod) | 5 | 4 | 5 | 42k | 19 |
| 2 | [Yup](https://github.com/jquense/yup) | 3 | 5 | 4 | 23.7k | 16 |
| 3 | [Valibot](https://github.com/fabian-hiller/valibot) | 5 | 4 | 4 | 8.5k | 16 |
| 4 | [Joi](https://github.com/hapijs/joi) | 4 | 3 | 5 | 21.2k | 16 |
| 5 | [Vest](https://github.com/ealush/vest) | 5 | 3 | 3 | 2.6k | 12 |

Коротко:

- `Zod` - самый ровный вариант по балансу.
- `Yup` - проще всего начать.
- `Valibot` - очень свежий и легкий по размеру.
- `Joi` - мощный, но API чуть сложнее.
- `Vest` - интересный DSL-подход, но комьюнити меньше.

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
