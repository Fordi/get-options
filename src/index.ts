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
  positional = [],
  allowExtra = false,
  description,
  validate,
  footer,
  command = relative(process.cwd(), process.argv[1]),
  ...specification
}: OptionsSpec<T>): GetOptions<T> {
  if (command === '') command = '.';

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

    const nakedArgs = positional.map((p) => {
      if (typeof p === 'string') return `{${p}}`;
      const argNames = getArgNames(p.trigger);
      return `{${p.name} ${argNames.join(' ')}}`;
    }).join(' ')
    let flagMax = 0;
    const flagStrs = {};
    Object.keys(spec).forEach((f) => {
      const s = spec[f];
      flagStrs[f] = `-${f}${s.long ? ` | --${s.long}` : ''}`;
      flagMax = Math.max(flagMax, flagStrs[f].length);
    });
    for (const p of positional) {
      if (typeof p !== 'string') {
        flagMax = Math.max(flagMax, p.name.length);
      }
    }
    const descs = Object.keys(spec).map((f) => {
      const flag = flagStrs[f].padEnd(flagMax);
      return `  ${flag}\t${spec[f].required ? '(required) ' : ''}${spec[f].description || ''}`;
    });
    for (const p of positional) {
      if (typeof p !== 'string') {
        descs.push(`  ${p.name.padEnd(flagMax)}\t${p.description || ''}`);
      }
    }
    stderr.write([
      (await (typeof description === 'function' ? description() : description)) || '',
      '',
      `Usage: node ${command} ${flags} ${nakedArgs}`,
      ...descs,
      '',
    ].join('\n'));
    if (footer) {
      stderr.write(await (typeof footer === 'function' ? footer() : footer) + "\n");
    }
  };
  
  const process = async (args: string[]) => {
    const posArgs = [...positional];
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
          const needed = s.trigger.length;
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
        if (posArgs.length) {
          const posSpec = posArgs.shift();
          if (typeof posSpec === 'string') {
            options[posSpec] = arg;
          } else {
            const needed = posSpec.trigger.length;
            const available = args.length - index - 1;
            const delta = needed - available;
            if (delta > 0) {
              throw new Error(`Expected ${delta} more arg${delta > 1 ? 's' : ''}`);
            }
            const params = args.slice(index + 1, index + 1 + needed);
            index += needed;
            merge(options, await posSpec.trigger(...params) || {});
          }
        } else if (allowExtra) {
          options.extra.push(arg);
        } else {
          throw new Error(`Unknown argument: ${arg}`);
        }
      }
    }
    if (posArgs.length) {
      throw new Error(`Expected required arguments ${posArgs.join(' ')}.`);
    }
    return options;
  };

  const spec = {
    ...specification,
  };
  if (!spec.h) {
    spec.h = {
      name: 'help',
      description: 'This help message',
      trigger: async () => {
        await usage();
        exit(0);
      },
    };
  }

  const read = async (argv: string[]): Promise<Options<T>> => {
    try {
      const options = await process(argv);
      if (validate) {
        const valid = await validate(options);
        if (valid) {
          merge(options, valid);
        }
      }
      return options;
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
