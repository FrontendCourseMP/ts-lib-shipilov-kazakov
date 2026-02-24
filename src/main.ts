import { form } from "./lib";
export { form } from "./lib";

const signupForm = document.querySelector<HTMLFormElement>("#signup-form");

if (signupForm) {
  const validator = form(signupForm);

  validator
    .field("username")
    .string()
    .required("Введите имя")
    .minlength(2, "Минимум 2 символа")
    .maxlength(30, "Максимум 30 символов");

  validator.field("email").string().required("Введите email").type("email");
}
