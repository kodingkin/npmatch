import "@testing-library/jest-dom";

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("If you do not provide a visible label")
  ) {
    return;
  }
  originalWarn(...args);
};
