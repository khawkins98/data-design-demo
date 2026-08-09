/**
 * Keep the existing app-local import surface while using the same context and
 * state helpers as the shared records capability. This makes the package a
 * single integration layer rather than forcing the host to mount two identical
 * locale providers.
 */
export * from "@undrr-eval/integration-react-aria";
