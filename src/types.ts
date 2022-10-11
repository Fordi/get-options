export type PositionalOptionSpec<T> = {
  // Convert arguments into properties
  // function length determines captured arguments
  // e.g., `(from, to) => ({ from, to })` will capture two arguments.
  trigger: (...args: unknown[]) => Partial<T> | Promise<Partial<T>> | void | Promise<void>;
  // option name (for usage)
  name: string;
  // option description
  description?: string;
};

export type OptionSpec<T> = PositionalOptionSpec<T> & {
  description: string;
  // long option name, e.g., "all" for "--all"
  name?: string;
  // Whether this is a required option
  required?: boolean;
};

type LC = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";
type UC = Uppercase<LC>;
type NM = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type AlphaNum = LC | UC | NM;

export type RestSpec<T> = Partial<Record<AlphaNum, OptionSpec<T>>>;

export type OptionsSpec<T> = RestSpec<T> & {
  // Name of command; if not present, will auto-detect from process.
  command?: string;
  // Names for the first N positional arguments
  positional?: (PositionalOptionSpec<T> | string)[];
  // Allow extra positional args
  allowExtra?: boolean;
  // Description for this CLI command
  description: string | Promise<string> | (() => Promise<string> | string);
  // validate the processed arguments; throw an error to indicate a problem
  validate?: (options: Record<string, unknown>) => Partial<Options<T>> | Promise<Partial<Options<T>>> | void | Promise<void>;
  // text to add below the usage statement
  footer?: string | Promise<string> | (() => Promise<string> | string);
};

export type Options<T> = T & {
  // Extra positional arguments (enable with allowExtra)
  extra?: string[];
};

export type GetOptions<T> = {
  usage: () => Promise<void>;
  read: (argv: string[]) => Promise<Options<T>>;
};