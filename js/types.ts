/**
 * Extracts the members of a constant array as a type. Used as:
 *
 * @example
 * const SOME_VALUES = ['a', 'b', 1, 2] as const;
 * type SomeValues = MemberOf<typeof SOME_VALUES>; // 'a' | 'b' | 1 | 2
 */
export type MemberOf<T extends ReadonlyArray<unknown>> =
  T extends ReadonlyArray<infer E> ? E : never;

/** A byte (0..255). This is not enforced by the compiler. */
export type byte = number;

/** A word (0..65535). This is not enforced by the compiler. */
export type word = number;

/** A raw region of memory. */
export type memory = Uint8Array | byte[];

export interface Memory {
  /** Read a byte. */
  read(page: byte, offset: byte): byte;
  /** Write a byte. */
  write(page: byte, offset: byte, value: byte): void;
}

/** A mapped region of memory. */
export interface MemoryPages extends Memory {
  /** Start page. */
  start(): byte;
  /** End page, inclusive. */
  end(): byte;
}
