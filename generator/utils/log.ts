import { inspect } from "node:util";

import chalk from "chalk";

function inspectArgs(args: unknown[]) {
  return args
    .map(arg =>
      typeof arg === "string" ? arg : inspect(arg, undefined, undefined, true),
    )
    .join(" ");
}

export const log = {
  padding: 0,
  group(name: string) {
    console.log(chalk.bold(name));
    this.padding += 2;
  },
  groupEnd() {
    this.padding -= 2;
  },
  info(...args: unknown[]) {
    console.log(
      " ".repeat(this.padding) +
        chalk.cyan("[i]", inspectArgs(args)) +
        chalk.reset(""),
    );
  },
  error(...args: unknown[]) {
    console.error(
      " ".repeat(this.padding) +
        chalk.red("[e]", inspectArgs(args)) +
        chalk.reset(""),
    );
  },
  debug(...args: unknown[]) {
    console.debug(
      " ".repeat(this.padding) +
        chalk.gray("[d]", inspectArgs(args)) +
        chalk.reset(""),
    );
  },
  warn(...args: unknown[]) {
    console.warn(
      " ".repeat(this.padding) +
        chalk.yellow("[w]", inspectArgs(args)) +
        chalk.reset(""),
    );
  },
};
