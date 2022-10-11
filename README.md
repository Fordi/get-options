# getOptions

Quick library for grabbing command line options.

### Usage

```javascript
const { usage, read } = getOptions({
  description: 'My CLI app',
  A: {
    description: 'Do it to them all',
    trigger: () => ({ all: true }),
  },
});
```

```typescript
type MyCLIOptions = {
  all?: boolean;
};

const { usage, read } = getOptions<MyCLIOptions>({
  description: 'My CLI app',
  A: {
    description: 'Do it to them all',
    trigger: () => ({ all: true }),
  },
});
```

See included types for details on the spec.