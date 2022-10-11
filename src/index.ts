import { relative } from "path";
import { GetOptions, Options, OptionsSpec } from "./types";

const merge = (target: Record<string, unknown>, ...objects: Record<string, unknown>[]) => {
  for (const obj of objects) {
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        let arr = [];
        if (target[key] !== undefined) {
          arr = target[key] as unknown[];
        }
        target[key] = [...new Set(arr.concat(...(obj[key] as unknown[])))];
      } else if (typeof obj[key] === 'object') {
        if (target[key] === undefined) {
          target[key] = {};
        }
        target[key] = merge(
          target[key] as Record<string, unknown>,
          obj[key] as Record<string, unknown>
        );
      } else {
        target[key] = obj[key];
      }
    }
  }
  return target;
};

const getArgNames = (fn) => {
  let argNames = [];
  fn.toString().replace(/^[^(]*\(([^)]*)\)/, (_, list) => {
    const l = list.trim();
    if (!l.length) return;
    argNames = l.split(',').map((a) => a.trim());
  });
  return argNames;
};



const { stderr, exit } = process;

function getOptions<T>({
  naked = [],
  allowExtra = false,
  description,
  validate,
  footer,
  cmd = relative(process.cwd(), process.argv[1]),
  ...specification
}: OptionsSpec<T>): GetOptions<T> {
  if (cmd === '') cmd = '.';

  const usage = async () => {
    const flags = Object.keys(spec).map((f) => {
      const s = spec[f];
      let rep = `-${f}`;
      if (s.long) rep = `${rep} | --${s.long}`;
      const argNames = getArgNames(s.trigger);
      if (argNames.length) {
        rep = `${rep} ${argNames.map((a) => `{${a}}`).join(' ')}`;
      }
      if (!s.required) {
        rep = `[${rep}]`;
      } else {
        rep = `{${rep}}`;
      }
      return rep;
    }).join(' ');

    const nakedArgs = naked.length ? `{${naked.join('} {')}}` : '';
    let flagMax = 0;
    const flagStrs = {};
    Object.keys(spec).forEach((f) => {
      const s = spec[f];
      flagStrs[f] = `-${f}${s.long ? ` | --${s.long}` : ''}`;
      flagMax = Math.max(flagMax, flagStrs[f].length);
    });
    const descs = Object.keys(spec).map((f) => {
      const flag = flagStrs[f].padEnd(flagMax);
      return `  ${flag}\t${spec[f].required ? '(required) ' : ''}${spec[f].description || ''}`;
    });
    stderr.write([
      (await (typeof description === 'function' ? description() : description)) || '',
      '',
      `Usage: node ${cmd} ${flags} ${nakedArgs}`,
      ...descs,
      '',
    ].join('\n'));
    if (footer) {
      stderr.write(await (typeof footer === 'function' ? footer() : footer) + "\n");
    }
  };
  
  const process = async (args: string[]) => {
    const nakedArgs = [...naked];
    const options = {} as Options<T>;
    if (allowExtra) {
      options.extra = [];
    }
    for (const f of Object.keys(spec)) {
      if (spec[f].default) {
        merge(options, await spec[f].default);
      }
    }
    for (let index = 0; index < args.length; index += 1) {
      let got = false;
      const arg = args[index];
      for (const f of Object.keys(spec)) {
        const s = spec[f];
        if (arg === `-${f}` || (s.long && arg === `--${s.long}`)) {
          got = true;
          const argNames = getArgNames(s.trigger);
          const needed = argNames.length;
          const available = args.length - index - 1;
          if (available < needed) {
            throw new Error(`Option -${s.long || f} requires ${needed} args, ${available} given.`);
          }
          const params = args.slice(index + 1, index + 1 + needed);
          index += needed;
          merge(options, await s.trigger(...params) || {});
        }
      }
      if (!got) {
        if (nakedArgs.length) {
          options[nakedArgs.shift()] = arg;
        } else if (allowExtra) {
          options.extra.push(arg);
        } else {
          throw new Error(`Unknown argument: ${arg}`);
        }
      }
    }
    if (nakedArgs.length) {
      throw new Error(`Expected required arguments ${nakedArgs.join(' ')}.`);
    }
    return options;
  };

  const spec = {
    ...specification,
    h: {
      description: 'This help message',
      long: 'help',
      trigger: async () => {
        await usage();
        exit(0);
      },
    },
  };

  const read = async (argv: string[]): Promise<Options<T>> => {
    try {
      const options = await process(argv);
      if (validate) {
        await validate(options);
      }
      return options as Options<T>;
    } catch (e) {
      stderr.write(`${e.message}\n`);
      await usage();
      exit(-1);
      throw e;
    }
  };

  return {
    usage,
    read,
  };
};

export default getOptions;
