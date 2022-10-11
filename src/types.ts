export type OptionSpec<T> = {
  long?: string;
  description: string;
  required?: boolean;
  trigger: (...args: unknown[]) => Partial<T> | Promise<Partial<T>>;
};

type LC = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";
type UC = Uppercase<LC>;
type NM = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type AlphaNum = LC | UC | NM;

export type RestSpec<T> = Partial<Record<AlphaNum, OptionSpec<T>>>;

export type OptionsSpec<T> = RestSpec<T> & {
  // Name of command; if not present, will auto-detect from process.
  cmd?: string;
  // Names for the first N naked arguments
  naked?: string[];
  // Allow extra naked args
  allowExtra?: boolean;
  // Description for this CLI command
  description: string | Promise<string> | (() => Promise<string> | string);
  // validate the processed arguments; throw an error to indicate a problem
  validate?: (options: Record<string, unknown>) => void | Promise<void>;
  // text to add below the usage statement
  footer?: string | Promise<string> | (() => Promise<string> | string);
};

export type Options<T> = T & {
  extra?: string[];
};

export type GetOptions<T> = {
  usage: () => Promise<void>;
  read: (argv: string[]) => Promise<Options<T>>;
};