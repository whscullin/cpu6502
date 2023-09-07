# Typescript 6502

The 6502 emulator from [apple1js] and [apple1js], pulled out to simplify keeping both emulators current.
It is cycle correct and implements documented and undocumented opcodes for several flavors of 6502
and 65c02 processors. It has evolved constantly since I first wrote it, around 2010, starting in JavaScript
and eventually being converted to Typescript by [Ian Flanigan](https://github.com/iflan/).

## Building

The emulator itself does not have any any dependencies outside of Typescript.

```shell
npm install
npm build
```

## Testing

The emulator has 3 primary test suites:

* `cpu6502.spec.ts` is the original set of tests that I wrote to prevent basic regressions.

* `cpu-klaus-dormann.spec.ts` is build around Klaus Dormann's [test ROMs](https://github.com/Klaus2m5/6502_65C02_functional_tests).
It's a more rigorous suite covering the documented opcodes, using actual 6502 code to execute the tests.

* `cpu-tom-harte.spec.ts` is an exhaustive suite covering both documented and undocumented opcodes for multiple
manufacturers. To use these you need to check out https://github.com/TomHarte/ProcessorTests repo, and set
the `TOM_HARTE_TEST_PATH` environment variable to point to the directory where it is checked out. These tests are very thorough and
time consuming, so they are not run by default.

