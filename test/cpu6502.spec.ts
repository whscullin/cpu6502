import { CPU6502, CpuState, FLAVOR_ROCKWELL_65C02, flags } from '../js/cpu6502';
import { TestMemory } from './util/memory';
import { bios, Program } from './util/bios';
import { toReadableState } from './util/cpu';

const DEFAULT_STATE: CpuState = {
  cycles: 0,
  s: flags.X,
  sp: 0xff,
  a: 0x00,
  x: 0x00,
  y: 0x00,
  pc: 0x0400,
};

let memory;
let cpu: CPU6502;
let program;

function initState(initialState: Partial<CpuState>) {
  const state = { ...DEFAULT_STATE, ...initialState };
  cpu.setState(state);
}

function expectState(initialState: CpuState, expectedState: Partial<CpuState>) {
  const state = { ...initialState, ...expectedState };
  expect(toReadableState(cpu.getState())).toEqual(toReadableState(state));
}

function initMemory(memAry: [page: number, off: number, data: number[]][]) {
  for (let idx = 0; idx < memAry.length; idx++) {
    const mem = memAry[idx];
    let page = mem[0];
    let off = mem[1];
    const data = mem[2];
    for (let jdx = 0; jdx < data.length; jdx++) {
      cpu.write(page, off++, data[jdx]);
      if (off > 0xff) {
        page++;
        off = 0;
      }
    }
  }
}

function expectMemory(
  expectAry: [page: number, off: number, data: number[]][],
) {
  const memAry = [];
  for (let idx = 0; idx < expectAry.length; idx++) {
    const mem = expectAry[idx];
    let page = mem[0];
    let off = mem[1];
    const expectData = mem[2];
    const data = [];
    for (let jdx = 0; jdx < expectData.length; jdx++) {
      data.push(cpu.read(page, off++));
      if (off > 0xff) {
        page++;
        off = 0;
      }
    }
    memAry.push([mem[0], mem[1], data]);
  }
  expect(memAry).toEqual(expectAry);
}

function expectStack(expectAry: number[]) {
  const state = cpu.getState();
  expectMemory([[0x01, state.sp + 1, expectAry]]);
}

function testCode(
  code: number[],
  steps: number,
  setupState: Partial<CpuState>,
  expectedState: Partial<CpuState>,
) {
  const initialState = { ...DEFAULT_STATE, ...setupState };
  const finalState = { pc: initialState.pc + code.length, ...expectedState };

  program = new Program(0x04, code);
  cpu.addPageHandler(program);

  cpu.setState(initialState);
  cpu.stepN(steps);
  expectState(initialState, finalState);
}

describe('CPU6502', function () {
  beforeEach(function () {
    cpu = new CPU6502();
    memory = new TestMemory(4);

    cpu.addPageHandler(memory);
    cpu.addPageHandler(bios);
  });

  describe('#step functions', function () {
    const code = [0xea, 0xea, 0xea, 0xea, 0xea, 0xea, 0xea, 0xea];
    const initialState = { ...DEFAULT_STATE };

    it('step', function () {
      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.step();
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x401,
        cycles: 2,
      });
      expect(cpu.getCycles()).toEqual(2);
    });

    it('step with callback', function () {
      const callback = jest.fn();
      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.step(callback);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x401,
        cycles: 2,
      });
      expect(cpu.getCycles()).toEqual(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('stepN', function () {
      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.stepN(4);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x404,
        cycles: 8,
      });
      expect(cpu.getCycles()).toEqual(8);
    });

    it('stepN with callback', function () {
      const callback = jest.fn();
      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.stepN(4, callback);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x404,
        cycles: 8,
      });
      expect(cpu.getCycles()).toEqual(8);
      expect(callback).toHaveBeenCalledTimes(4);
    });

    it('stepN with breakpoint', function () {
      const callback = jest.fn().mockReturnValue(true);
      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.stepN(4, callback);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x401,
        cycles: 2,
      });
      expect(cpu.getCycles()).toEqual(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('stepCycles', function () {
      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.stepCycles(4);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x402,
        cycles: 4,
      });
      expect(cpu.getCycles()).toEqual(4);
    });

    it('stepCyclesDebug', function () {
      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.stepCyclesDebug(4);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x402,
        cycles: 4,
      });
      expect(cpu.getCycles()).toEqual(4);
    });

    it('stepCyclesDebug with callback', function () {
      const callback = jest.fn();

      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.stepCyclesDebug(4, callback);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x402,
        cycles: 4,
      });
      expect(cpu.getCycles()).toEqual(4);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('stepCyclesDebug with breakpoint', function () {
      const callback = jest.fn().mockReturnValue(true);

      cpu.setState(initialState);
      program = new Program(0x04, code);
      cpu.addPageHandler(program);
      cpu.stepCyclesDebug(4, callback);
      expect(cpu.getState()).toEqual({
        ...DEFAULT_STATE,
        pc: 0x401,
        cycles: 2,
      });
      expect(cpu.getCycles()).toEqual(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('#signals', function () {
    it('should reset', function () {
      cpu.reset();

      expectState(DEFAULT_STATE, {
        cycles: 2,
      });
    });

    it('should irq', function () {
      cpu.irq();

      expectState(DEFAULT_STATE, {
        cycles: 5,
        s: flags.X | flags.I,
        sp: 0xfc,
        pc: 0xff00,
      });
    });

    it('should not irq if I set', function () {
      initState({
        s: flags.X | flags.I,
      });

      cpu.irq();

      expectState(DEFAULT_STATE, {
        s: flags.X | flags.I,
        pc: 0x400,
      });
    });

    it('should nmi', function () {
      cpu.nmi();

      expectState(DEFAULT_STATE, {
        cycles: 5,
        s: flags.X | flags.I,
        sp: 0xfc,
        pc: 0xff00,
      });
    });
  });

  describe('#misc', function () {
    it('should NOP', function () {
      testCode(
        [0xea],
        1,
        {},
        {
          cycles: 2,
        },
      );
    });

    it('should BRK', function () {
      testCode(
        [0x00, 0x00],
        1,
        {},
        {
          cycles: 7,
          s: flags.X | flags.I,
          sp: 0xfc,
          pc: 0xff00,
        },
      );
    });

    it('should RTI', function () {
      initMemory([[0x01, 0xfd, [0xa0, 0x34, 0x12]]]);
      testCode(
        [0x40],
        1,
        {
          sp: 0xfc,
        },
        {
          cycles: 6,
          s: flags.X | flags.N,
          sp: 0xff,
          pc: 0x1234,
        },
      );
    });
  });

  describe('#registers', function () {
    it('should LDA immediate', function () {
      testCode(
        [0xa9, 0x44],
        1,
        {},
        {
          cycles: 2,
          a: 0x44,
        },
      );
    });

    it('should TAX', function () {
      testCode(
        [0xaa],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 2,
          x: 0x44,
        },
      );
    });

    it('should TAY', function () {
      testCode(
        [0xa8],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 2,
          y: 0x44,
        },
      );
    });

    it('should LDX immediate', function () {
      testCode(
        [0xa2, 0x44],
        1,
        {},
        {
          cycles: 2,
          x: 0x44,
        },
      );
    });

    it('should TXA', function () {
      testCode(
        [0x8a],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 2,
          a: 0x44,
        },
      );
    });

    it('should DEX', function () {
      testCode(
        [0xca],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 2,
          x: 0x43,
        },
      );
    });

    it('should INX', function () {
      testCode(
        [0xe8],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 2,
          x: 0x45,
        },
      );
    });

    it('should LDY immediate', function () {
      testCode(
        [0xa0, 0x44],
        1,
        {},
        {
          cycles: 2,
          y: 0x44,
        },
      );
    });

    it('should TYA', function () {
      testCode(
        [0x98],
        1,
        {
          y: 0x44,
        },
        {
          cycles: 2,
          a: 0x44,
        },
      );
    });

    it('should DEY', function () {
      testCode(
        [0x88],
        1,
        {
          y: 0x44,
        },
        {
          cycles: 2,
          y: 0x43,
        },
      );
    });

    it('should INY', function () {
      testCode(
        [0xc8],
        1,
        {
          y: 0x44,
        },
        {
          cycles: 2,
          y: 0x45,
        },
      );
    });
  });

  describe('#flags', function () {
    it('should SEC', function () {
      testCode(
        [0x38],
        1,
        {},
        {
          cycles: 2,
          s: flags.X | flags.C,
        },
      );
    });

    it('should CLC', function () {
      testCode(
        [0x18],
        1,
        {
          s: flags.X | flags.C,
        },
        {
          cycles: 2,
          s: flags.X,
        },
      );
    });

    it('should SEI', function () {
      testCode(
        [0x78],
        1,
        {},
        {
          cycles: 2,
          s: flags.X | flags.I,
        },
      );
    });

    it('should CLI', function () {
      testCode(
        [0x58],
        1,
        {
          s: flags.X | flags.I,
        },
        {
          cycles: 2,
          s: flags.X,
        },
      );
    });

    it('should CLV', function () {
      testCode(
        [0xb8],
        1,
        {
          s: flags.X | flags.V,
        },
        {
          cycles: 2,
          s: flags.X,
        },
      );
    });

    it('should SED', function () {
      testCode(
        [0xf8],
        1,
        {},
        {
          cycles: 2,
          s: flags.X | flags.D,
        },
      );
    });

    it('should CLD', function () {
      testCode(
        [0xd8],
        1,
        {
          s: flags.X | flags.D,
        },
        {
          cycles: 2,
          s: flags.X,
        },
      );
    });
  });

  describe('#stack', function () {
    it('should TXS', function () {
      testCode(
        [0x9a],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 2,
          sp: 0x44,
        },
      );
    });

    it('should TSX', function () {
      testCode(
        [0xba],
        1,
        {
          sp: 0x44,
        },
        {
          cycles: 2,
          x: 0x44,
        },
      );
    });

    it('should PHA', function () {
      testCode(
        [0x48],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 3,
          sp: 0xfe,
        },
      );
      expectStack([0x44]);
    });

    it('should PLA', function () {
      initMemory([[0x01, 0xff, [0x44]]]);
      testCode(
        [0x68],
        1,
        {
          sp: 0xfe,
        },
        {
          cycles: 4,
          a: 0x44,
          sp: 0xff,
        },
      );
    });

    it('should PHP', function () {
      testCode(
        [0x08],
        1,
        {
          s: flags.X | flags.N | flags.C,
        },
        {
          cycles: 3,
          sp: 0xfe,
        },
      );
      expectStack([flags.X | flags.B | flags.N | flags.C]);
    });

    it('should PLP', function () {
      initMemory([[0x01, 0xff, [flags.N | flags.C]]]);
      testCode(
        [0x28],
        1,
        {
          sp: 0xfe,
        },
        {
          cycles: 4,
          s: flags.X | flags.N | flags.C,
          sp: 0xff,
        },
      );
    });
  });

  describe('#jumps', function () {
    it('should JMP abs', function () {
      testCode(
        [0x4c, 0x34, 0x12],
        1,
        {},
        {
          cycles: 3,
          pc: 0x1234,
        },
      );
    });

    it('should JMP (abs)', function () {
      initMemory([[0x03, 0x33, [0x34, 0x12]]]);
      testCode(
        [0x6c, 0x33, 0x03],
        1,
        {},
        {
          cycles: 5,
          pc: 0x1234,
        },
      );
    });

    it('should JMP (abs) across page boundaries with bugs', function () {
      initMemory([
        [0x02, 0xff, [0x34, 0x12]],
        [0x02, 0x00, [0xff]],
      ]);
      testCode(
        [0x6c, 0xff, 0x02],
        1,
        {},
        {
          cycles: 5,
          pc: 0xff34,
        },
      );
    });

    it('should JSR abs', function () {
      testCode(
        [0x20, 0x34, 0x12],
        1,
        {},
        {
          cycles: 6,
          sp: 0xfd,
          pc: 0x1234,
        },
      );
      expectStack([0x02, 0x04]);
    });

    it('should RTS', function () {
      initMemory([[0x01, 0xfe, [0x34, 0x12]]]);
      testCode(
        [0x60],
        1,
        {
          sp: 0xfd,
        },
        {
          cycles: 6,
          sp: 0xff,
          pc: 0x1235,
        },
      );
    });
  });

  describe('#branches', function () {
    // ********** bcs
    it('should BCS forward', function () {
      testCode(
        [0xb0, 0x7f],
        1,
        {
          s: flags.X | flags.C,
        },
        {
          cycles: 3,
          pc: 0x0481,
        },
      );
    });

    it('should BCS backward', function () {
      testCode(
        [0xb0, 0xff],
        1,
        {
          s: flags.X | flags.C,
        },
        {
          cycles: 3,
          pc: 0x0401,
        },
      );
    });

    it('should BCS across pages with an extra cycle', function () {
      testCode(
        [0xb0, 0xfd],
        1,
        {
          s: flags.X | flags.C,
        },
        {
          cycles: 4,
          pc: 0x03ff,
        },
      );
    });

    it('should not BCS if carry clear', function () {
      testCode(
        [0xb0, 0xfd],
        1,
        {},
        {
          cycles: 2,
          pc: 0x0402,
        },
      );
    });

    it('should BCC forward', function () {
      testCode(
        [0x90, 0x7f],
        1,
        {},
        {
          cycles: 3,
          pc: 0x0481,
        },
      );
    });

    it('should BCC backward', function () {
      testCode(
        [0x90, 0xff],
        1,
        {},
        {
          cycles: 3,
          pc: 0x0401,
        },
      );
    });

    it('should BCC across pages with an extra cycle', function () {
      testCode(
        [0x90, 0xfd],
        1,
        {},
        {
          cycles: 4,
          pc: 0x03ff,
        },
      );
    });

    it('should not BCC if carry set', function () {
      testCode(
        [0x90, 0xfd],
        1,
        {
          s: flags.X | flags.C,
        },
        {
          cycles: 2,
          pc: 0x0402,
        },
      );
    });
  });

  describe('#read memory', function () {
    // ********** zp
    it('should LDY zp', function () {
      initMemory([[0x00, 0x33, [0x44]]]);
      testCode(
        [0xa4, 0x33],
        1,
        {},
        {
          cycles: 3,
          y: 0x44,
        },
      );
    });

    it('should LDA zp', function () {
      initMemory([[0x00, 0x33, [0x44]]]);
      testCode(
        [0xa5, 0x33],
        1,
        {},
        {
          cycles: 3,
          a: 0x44,
        },
      );
    });

    it('should LDX zp', function () {
      initMemory([[0x00, 0x33, [0x44]]]);
      testCode(
        [0xa6, 0x33],
        1,
        {},
        {
          cycles: 3,
          x: 0x44,
        },
      );
    });

    // ********** zp,x
    it('should LDY zp,x', function () {
      initMemory([[0x00, 0x36, [0x44]]]);
      testCode(
        [0xb4, 0x33],
        1,
        {
          x: 3,
        },
        {
          cycles: 4,
          y: 0x44,
        },
      );
    });

    it('should LDA zp,x', function () {
      initMemory([[0x00, 0x36, [0x44]]]);
      testCode(
        [0xb5, 0x33],
        1,
        {
          x: 3,
        },
        {
          cycles: 4,
          a: 0x44,
        },
      );
    });

    // ********** zp,y
    it('should LDX zp,y', function () {
      initMemory([[0x00, 0x36, [0x44]]]);
      testCode(
        [0xb6, 0x33],
        1,
        {
          y: 3,
        },
        {
          cycles: 4,
          x: 0x44,
        },
      );
    });

    // ********** (zp,x)
    it('should LDA (zp,x)', function () {
      initMemory([
        [0x00, 0x36, [0x33, 0x03]],
        [0x03, 0x33, [0x44]],
      ]);
      testCode(
        [0xa1, 0x33],
        1,
        {
          x: 3,
        },
        {
          cycles: 6,
          a: 0x44,
        },
      );
    });

    // ********** (zp),y
    it('should LDA (zp),y', function () {
      initMemory([
        [0x00, 0x33, [0x33, 0x03]],
        [0x03, 0x36, [0x44]],
      ]);
      testCode(
        [0xb1, 0x33],
        1,
        {
          y: 3,
        },
        {
          cycles: 5,
          a: 0x44,
        },
      );
    });

    // ********** (zp),y
    it('should LDA (zp),y with an extra cycle on page cross', function () {
      initMemory([
        [0x00, 0x33, [0x33, 0x02]],
        [0x03, 0x32, [0x44]],
      ]);
      testCode(
        [0xb1, 0x33],
        1,
        {
          y: 0xff,
        },
        {
          cycles: 6,
          a: 0x44,
        },
      );
    });

    // ********** abs
    it('should LDY abs', function () {
      initMemory([[0x03, 0x33, [0x44]]]);
      testCode(
        [0xac, 0x33, 0x03],
        1,
        {},
        {
          cycles: 4,
          y: 0x44,
        },
      );
    });

    it('should LDA abs', function () {
      initMemory([[0x03, 0x33, [0x44]]]);
      testCode(
        [0xad, 0x33, 0x03],
        1,
        {},
        {
          cycles: 4,
          a: 0x44,
        },
      );
    });

    it('should LDX abs', function () {
      initMemory([[0x03, 0x33, [0x44]]]);
      testCode(
        [0xae, 0x33, 0x03],
        1,
        {},
        {
          cycles: 4,
          x: 0x44,
        },
      );
    });

    // ********** abs, x
    it('should LDY abs,x', function () {
      initMemory([[0x03, 0x36, [0x44]]]);
      testCode(
        [0xbc, 0x33, 0x03],
        1,
        {
          x: 3,
        },
        {
          cycles: 4,
          y: 0x44,
        },
      );
    });

    it('should LDA abs,x', function () {
      initMemory([[0x03, 0x36, [0x44]]]);
      testCode(
        [0xbd, 0x33, 0x03],
        1,
        {
          x: 3,
        },
        {
          cycles: 4,
          a: 0x44,
        },
      );
    });

    it('should LDY abs,x with extra cycle on page cross', function () {
      initMemory([[0x03, 0x32, [0x44]]]);
      testCode(
        [0xbc, 0x33, 0x02],
        1,
        {
          x: 0xff,
        },
        {
          cycles: 5,
          y: 0x44,
        },
      );
    });

    it('should LDA abs,x with extra cycle on page cross', function () {
      initMemory([[0x03, 0x32, [0x44]]]);
      testCode(
        [0xbd, 0x33, 0x02],
        1,
        {
          x: 0xff,
        },
        {
          cycles: 5,
          a: 0x44,
        },
      );
    });

    // ********** abs, y
    it('should LDX abs,y', function () {
      initMemory([[0x03, 0x36, [0x44]]]);
      testCode(
        [0xbe, 0x33, 0x03],
        1,
        {
          y: 3,
        },
        {
          cycles: 4,
          x: 0x44,
        },
      );
    });

    it('should LDX abs,y with extra cycle on page cross', function () {
      initMemory([[0x03, 0x32, [0x44]]]);
      testCode(
        [0xbe, 0x33, 0x02],
        1,
        {
          y: 0xff,
        },
        {
          cycles: 5,
          x: 0x44,
        },
      );
    });
  });

  describe('#write memory', function () {
    // ********** zp
    it('should STY zp', function () {
      testCode(
        [0x84, 0x33],
        1,
        {
          y: 0x44,
        },
        {
          cycles: 3,
        },
      );
      expectMemory([[0x00, 0x33, [0x44]]]);
    });

    it('should STA zp', function () {
      testCode(
        [0x85, 0x33],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 3,
        },
      );
      expectMemory([[0x00, 0x33, [0x44]]]);
    });

    it('should STX zp', function () {
      testCode(
        [0x86, 0x33],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 3,
        },
      );
      expectMemory([[0x00, 0x33, [0x44]]]);
    });

    // ********** zp,x
    it('should STY zp,x', function () {
      testCode(
        [0x94, 0x33],
        1,
        {
          x: 3,
          y: 0x44,
        },
        {
          cycles: 4,
        },
      );
      expectMemory([[0x00, 0x36, [0x44]]]);
    });

    it('should STA zp,x', function () {
      testCode(
        [0x95, 0x33],
        1,
        {
          a: 0x44,
          x: 3,
        },
        {
          cycles: 4,
        },
      );
      expectMemory([[0x00, 0x36, [0x44]]]);
    });

    // ********** zp,y
    it('should STX zp,y', function () {
      testCode(
        [0x96, 0x33],
        1,
        {
          x: 0x44,
          y: 3,
        },
        {
          cycles: 4,
        },
      );
      expectMemory([[0x00, 0x36, [0x44]]]);
    });

    // ********** (zp,x)
    it('should STA (zp,x)', function () {
      initMemory([[0x00, 0x36, [0x33, 0x03]]]);
      testCode(
        [0x81, 0x33],
        1,
        {
          a: 0x44,
          x: 3,
        },
        {
          cycles: 6,
        },
      );
      expectMemory([[0x03, 0x33, [0x44]]]);
    });

    // ********** (zp),y
    it('should STA (zp),y', function () {
      initMemory([[0x00, 0x33, [0x33, 0x03]]]);
      testCode(
        [0x91, 0x33],
        1,
        {
          a: 0x44,
          y: 3,
        },
        {
          cycles: 6,
        },
      );
      expectMemory([[0x03, 0x36, [0x44]]]);
    });

    // ********** abs
    it('should STY abs', function () {
      testCode(
        [0x8c, 0x33, 0x03],
        1,
        {
          y: 0x44,
        },
        {
          cycles: 4,
        },
      );
      expectMemory([[0x03, 0x33, [0x44]]]);
    });

    it('should STA abs', function () {
      testCode(
        [0x8d, 0x33, 0x03],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 4,
        },
      );
      expectMemory([[0x03, 0x33, [0x44]]]);
    });

    it('should STX abs', function () {
      testCode(
        [0x8e, 0x33, 0x03],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 4,
        },
      );
      expectMemory([[0x03, 0x33, [0x44]]]);
    });

    // ********** abs, x
    it('should STA abs,x', function () {
      testCode(
        [0x9d, 0x33, 0x03],
        1,
        {
          a: 0x44,
          x: 0x03,
        },
        {
          cycles: 5,
        },
      );
      expectMemory([[0x03, 0x36, [0x44]]]);
    });

    it('should STA abs,x with no extra cycle on page cross', function () {
      testCode(
        [0x9d, 0x33, 0x02],
        1,
        {
          a: 0x44,
          x: 0xff,
        },
        {
          cycles: 5,
          pc: 0x0403,
        },
      );
      expectMemory([[0x03, 0x32, [0x44]]]);
    });

    // ********** abs, y
    it('should STA abs,y', function () {
      testCode(
        [0x99, 0x33, 0x03],
        1,
        {
          a: 0x44,
          y: 0x03,
        },
        {
          cycles: 5,
        },
      );
      expectMemory([[0x03, 0x36, [0x44]]]);
    });

    it('should STA abs,y with no extra cycle on page cross', function () {
      testCode(
        [0x99, 0x33, 0x02],
        1,
        {
          a: 0x44,
          y: 0xff,
        },
        {
          cycles: 5,
        },
      );
      expectMemory([[0x03, 0x32, [0x44]]]);
    });
  });

  describe('#bit operations', function () {
    // ********** ASL
    it('should ASL A', function () {
      testCode(
        [0x0a],
        1,
        {
          a: 0x55,
        },
        {
          cycles: 2,
          a: 0xaa,
          s: flags.X | flags.N,
        },
      );
    });

    it('should ASL A with carry out', function () {
      testCode(
        [0x0a],
        1,
        {
          a: 0xaa,
        },
        {
          cycles: 2,
          a: 0x54,
          s: flags.X | flags.C,
        },
      );
    });

    it('should ASL abs', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x0e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
          s: flags.X | flags.N,
        },
      );
      expectMemory([[0x03, 0x33, [0xaa]]]);
    });

    it('should ASL abs with carry out', function () {
      initMemory([[0x03, 0x33, [0xaa]]]);
      testCode(
        [0x0e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
          s: flags.X | flags.C,
        },
      );
      expectMemory([[0x03, 0x33, [0x54]]]);
    });

    // ********** ROL
    it('should ROL A', function () {
      testCode(
        [0x2a],
        1,
        {
          a: 0x55,
        },
        {
          cycles: 2,
          a: 0xaa,
          s: flags.X | flags.N,
        },
      );
    });

    it('should ROL A with carry out', function () {
      testCode(
        [0x2a],
        1,
        {
          a: 0xaa,
        },
        {
          cycles: 2,
          a: 0x54,
          s: flags.X | flags.C,
        },
      );
    });

    it('should ROL A with carry in', function () {
      testCode(
        [0x2a],
        1,
        {
          s: flags.X | flags.C,
          a: 0xaa,
        },
        {
          cycles: 2,
          a: 0x55,
          s: flags.X | flags.C,
        },
      );
    });

    it('should ROL abs', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x2e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
          s: flags.X | flags.N,
        },
      );
      expectMemory([[0x03, 0x33, [0xaa]]]);
    });

    it('should ROL abs with carry out', function () {
      initMemory([[0x03, 0x33, [0xaa]]]);
      testCode(
        [0x2e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
          s: flags.X | flags.C,
        },
      );
      expectMemory([[0x03, 0x33, [0x54]]]);
    });

    it('should ROL abs with carry in', function () {
      initMemory([[0x03, 0x33, [0xaa]]]);
      testCode(
        [0x2e, 0x33, 0x03],
        1,
        {
          s: flags.X | flags.C,
        },
        {
          cycles: 6,
          s: flags.X | flags.C,
        },
      );
      expectMemory([[0x03, 0x33, [0x55]]]);
    });

    // ********** LSR
    it('should LSR A', function () {
      testCode(
        [0x4a],
        1,
        {
          a: 0xaa,
        },
        {
          cycles: 2,
          a: 0x55,
        },
      );
    });

    it('should LSR A with carry out', function () {
      testCode(
        [0x4a],
        1,
        {
          a: 0x55,
        },
        {
          cycles: 2,
          a: 0x2a,
          s: flags.X | flags.C,
        },
      );
    });

    it('should LSR abs', function () {
      initMemory([[0x03, 0x33, [0xaa]]]);
      testCode(
        [0x4e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
        },
      );
      expectMemory([[0x03, 0x33, [0x55]]]);
    });

    it('should LSR abs with carry out', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x4e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
          s: flags.X | flags.C,
        },
      );
      expectMemory([[0x03, 0x33, [0x2a]]]);
    });

    // ********** ROR
    it('should ROR A', function () {
      testCode(
        [0x6a],
        1,
        {
          a: 0xaa,
        },
        {
          cycles: 2,
          a: 0x55,
        },
      );
    });

    it('should ROR A with carry out', function () {
      testCode(
        [0x6a],
        1,
        {
          a: 0x55,
        },
        {
          cycles: 2,
          s: flags.X | flags.C,
          a: 0x2a,
        },
      );
    });

    it('should ROR A with carry in', function () {
      testCode(
        [0x6a],
        1,
        {
          s: flags.X | flags.C,
          a: 0x55,
        },
        {
          cycles: 2,
          s: flags.X | flags.C | flags.N,
          a: 0xaa,
        },
      );
    });

    it('should ROR abs', function () {
      initMemory([[0x03, 0x33, [0xaa]]]);
      testCode(
        [0x6e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
        },
      );
      expectMemory([[0x03, 0x33, [0x55]]]);
    });

    it('should ROR abs with carry out', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x6e, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
          s: flags.X | flags.C,
        },
      );
      expectMemory([[0x03, 0x33, [0x2a]]]);
    });

    it('should ROR abs with carry in', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x6e, 0x33, 0x03],
        1,
        {
          s: flags.X | flags.C,
        },
        {
          cycles: 6,
          s: flags.X | flags.C | flags.N,
        },
      );
      expectMemory([[0x03, 0x33, [0xaa]]]);
    });

    it('should AND', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x2d, 0x33, 0x03],
        1,
        {
          a: 0xa5,
        },
        {
          cycles: 4,
          a: 0x05,
        },
      );
    });

    it('should ORA', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x0d, 0x33, 0x03],
        1,
        {
          a: 0xa0,
        },
        {
          cycles: 4,
          s: flags.X | flags.N,
          a: 0xf5,
        },
      );
    });

    it('should EOR', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x4d, 0x33, 0x03],
        1,
        {
          a: 0xa5,
        },
        {
          cycles: 4,
          s: flags.X | flags.N,
          a: 0xf0,
        },
      );
    });

    it('should BIT zp', function () {
      initMemory([[0x00, 0x33, [0x55]]]);
      testCode(
        [0x24, 0x33],
        1,
        {
          a: 0x55,
        },
        {
          cycles: 3,
          s: flags.X | flags.V,
        },
      );
    });

    it('should BIT abs', function () {
      initMemory([[0x03, 0x33, [0xaa]]]);
      testCode(
        [0x2c, 0x33, 0x03],
        1,
        {},
        {
          cycles: 4,
          s: flags.X | flags.N | flags.Z,
        },
      );
    });
  });

  describe('#math', function () {
    // ********** ADC
    it('should ADC', function () {
      testCode(
        [0x69, 0x55],
        1,
        {
          a: 0x23,
        },
        {
          cycles: 2,
          a: 0x78,
          s: flags.X,
        },
      );
    });

    it('should ADC with carry in', function () {
      testCode(
        [0x69, 0x55],
        1,
        {
          a: 0x23,
          s: flags.X | flags.C,
        },
        {
          cycles: 2,
          a: 0x79,
          s: flags.X,
        },
      );
    });

    it('should ADC with overflow out', function () {
      testCode(
        [0x69, 0x55],
        1,
        {
          a: 0x2b,
        },
        {
          cycles: 2,
          a: 0x80,
          s: flags.X | flags.N | flags.V,
        },
      );
    });

    it('should ADC with carry out', function () {
      testCode(
        [0x69, 0x55],
        1,
        {
          a: 0xbb,
        },
        {
          cycles: 2,
          a: 0x10,
          s: flags.X | flags.C,
        },
      );
    });

    // ********** ADC BCD
    it('should ADC BCD', function () {
      testCode(
        [0x69, 0x16],
        1,
        {
          s: flags.X | flags.D,
          a: 0x25,
        },
        {
          cycles: 2,
          s: flags.X | flags.D,
          a: 0x41,
        },
      );
    });

    it('should ADC BCD with carry in', function () {
      testCode(
        [0x69, 0x55],
        1,
        {
          s: flags.X | flags.D | flags.C,
          a: 0x23,
        },
        {
          cycles: 2,
          s: flags.X | flags.D,
          a: 0x79,
        },
      );
    });

    it('should ADC BCD with carry out', function () {
      testCode(
        [0x69, 0x10],
        1,
        {
          s: flags.X | flags.D,
          a: 0x91,
        },
        {
          cycles: 2,
          a: 0x01,
          s: flags.X | flags.N | flags.D | flags.C,
        },
      );
    });

    // ********** SBC
    it('should SBC', function () {
      testCode(
        [0xe9, 0x23],
        1,
        {
          s: flags.X | flags.C,
          a: 0x55,
        },
        {
          cycles: 2,
          a: 0x32,
          s: flags.X | flags.C,
        },
      );
    });

    it('should SBC with borrow in', function () {
      testCode(
        [0xe9, 0x23],
        1,
        {
          s: flags.X,
          a: 0x55,
        },
        {
          cycles: 2,
          a: 0x31,
          s: flags.X | flags.C,
        },
      );
    });

    it('should SBC with borrow out', function () {
      testCode(
        [0xe9, 0x55],
        1,
        {
          s: flags.X | flags.C,
          a: 0x23,
        },
        {
          cycles: 2,
          a: 0xce,
          s: flags.X | flags.N,
        },
      );
    });

    it('should SBC with overflow out', function () {
      testCode(
        [0xe9, 0x7f],
        1,
        {
          s: flags.X | flags.C,
          a: 0xaf,
        },
        {
          cycles: 2,
          a: 0x30,
          s: flags.X | flags.V | flags.C,
        },
      );
    });

    // ********** SBC BCD
    it('should SBC BCD', function () {
      testCode(
        [0xe9, 0x23],
        1,
        {
          s: flags.X | flags.D | flags.C,
          a: 0x55,
        },
        {
          cycles: 2,
          a: 0x32,
          s: flags.X | flags.D | flags.C,
        },
      );
    });

    it('should SBC BCD with borrow in', function () {
      testCode(
        [0xe9, 0x23],
        1,
        {
          s: flags.X | flags.D,
          a: 0x55,
        },
        {
          cycles: 2,
          a: 0x31,
          s: flags.X | flags.D | flags.C,
        },
      );
    });

    it('should SBC BCD with borrow out', function () {
      testCode(
        [0xe9, 0x55],
        1,
        {
          s: flags.X | flags.D | flags.C,
          a: 0x23,
        },
        {
          cycles: 2,
          a: 0x68,
          s: flags.X | flags.N | flags.D,
        },
      );
    });

    // ********** INC
    it('should INC zp', function () {
      initMemory([[0x00, 0x33, [0x44]]]);
      testCode(
        [0xe6, 0x33],
        1,
        {},
        {
          cycles: 5,
        },
      );
      expectMemory([[0x00, 0x33, [0x45]]]);
    });

    it('should INC zp,x', function () {
      initMemory([[0x00, 0x043, [0x44]]]);
      testCode(
        [0xf6, 0x33],
        1,
        {
          x: 0x10,
        },
        {
          cycles: 6,
        },
      );
      expectMemory([[0x00, 0x43, [0x45]]]);
    });

    it('should INC abs', function () {
      initMemory([[0x03, 0x33, [0x44]]]);
      testCode(
        [0xee, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
        },
      );
      expectMemory([[0x03, 0x33, [0x45]]]);
    });

    it('should INC abs,x', function () {
      initMemory([[0x03, 0x043, [0x44]]]);
      testCode(
        [0xfe, 0x33, 0x03],
        1,
        {
          x: 0x10,
        },
        {
          cycles: 7,
        },
      );
      expectMemory([[0x03, 0x43, [0x45]]]);
    });

    // ********** DEC
    it('should DEC zp', function () {
      initMemory([[0x00, 0x33, [0x44]]]);
      testCode(
        [0xc6, 0x33],
        1,
        {},
        {
          cycles: 5,
        },
      );
      expectMemory([[0x00, 0x33, [0x43]]]);
    });

    it('should DEC zp,x', function () {
      initMemory([[0x00, 0x043, [0x44]]]);
      testCode(
        [0xd6, 0x33],
        1,
        {
          x: 0x10,
        },
        {
          cycles: 6,
        },
      );
      expectMemory([[0x00, 0x43, [0x43]]]);
    });

    it('should DEC abs', function () {
      initMemory([[0x03, 0x33, [0x44]]]);
      testCode(
        [0xce, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
        },
      );
      expectMemory([[0x03, 0x33, [0x43]]]);
    });

    it('should DEC abs,x', function () {
      initMemory([[0x03, 0x043, [0x44]]]);
      testCode(
        [0xde, 0x33, 0x03],
        1,
        {
          x: 0x10,
        },
        {
          cycles: 7,
        },
      );
      expectMemory([[0x03, 0x43, [0x43]]]);
    });
  });

  describe('#comparison', function () {
    // ********** CMP
    it('should CMP less than', function () {
      testCode(
        [0xc9, 0x44],
        1,
        {
          a: 0x33,
        },
        {
          cycles: 2,
          s: flags.X | flags.N,
        },
      );
    });

    it('should CMP equal', function () {
      testCode(
        [0xc9, 0x44],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 2,
          s: flags.X | flags.Z | flags.C,
        },
      );
    });

    it('should CMP greater than', function () {
      testCode(
        [0xc9, 0x44],
        1,
        {
          a: 0x55,
        },
        {
          cycles: 2,
          s: flags.X | flags.C,
        },
      );
    });

    // ********** CPX
    it('should CPX less than', function () {
      testCode(
        [0xe0, 0x44],
        1,
        {
          x: 0x33,
        },
        {
          cycles: 2,
          s: flags.X | flags.N,
        },
      );
    });

    it('should CPX equal', function () {
      testCode(
        [0xe0, 0x44],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 2,
          s: flags.X | flags.Z | flags.C,
        },
      );
    });

    it('should CPX greater than', function () {
      testCode(
        [0xe0, 0x44],
        1,
        {
          x: 0x55,
        },
        {
          cycles: 2,
          s: flags.X | flags.C,
        },
      );
    });

    // ********** CPY
    it('should CPY less than', function () {
      testCode(
        [0xe0, 0x44],
        1,
        {
          y: 0x33,
        },
        {
          cycles: 2,
          s: flags.X | flags.N,
        },
      );
    });

    it('should CPY equal', function () {
      testCode(
        [0xc0, 0x44],
        1,
        {
          y: 0x44,
        },
        {
          cycles: 2,
          s: flags.X | flags.Z | flags.C,
        },
      );
    });

    it('should CPY greater than', function () {
      testCode(
        [0xc0, 0x44],
        1,
        {
          y: 0x55,
        },
        {
          cycles: 2,
          s: flags.X | flags.C,
        },
      );
    });
  });
});

describe('65c02', function () {
  beforeEach(function () {
    cpu = new CPU6502({ flavor: FLAVOR_ROCKWELL_65C02 });
    memory = new TestMemory(4);

    cpu.addPageHandler(memory);
    cpu.addPageHandler(bios);
  });

  describe('#signals', function () {
    it('should clear D on IRQ', function () {
      initState({
        s: flags.X | flags.D,
      });

      cpu.irq();

      expectState(DEFAULT_STATE, {
        cycles: 5,
        s: flags.X | flags.I,
        sp: 0xfc,
        pc: 0xff00,
      });
    });

    it('should clear D on NMI', function () {
      initState({
        s: flags.X | flags.D,
      });

      cpu.nmi();

      expectState(DEFAULT_STATE, {
        cycles: 5,
        s: flags.X | flags.I,
        sp: 0xfc,
        pc: 0xff00,
      });
    });

    it('should clear D on BRK', function () {
      testCode(
        [0x00, 0x00],
        1,
        {
          s: flags.X | flags.D,
        },
        {
          cycles: 7,
          s: flags.X | flags.I,
          sp: 0xfc,
          pc: 0xff00,
        },
      );
    });
  });

  describe('#stack', function () {
    it('should PHX', function () {
      testCode(
        [0xda],
        1,
        {
          x: 0x44,
        },
        {
          cycles: 3,
          sp: 0xfe,
        },
      );
      expectStack([0x44]);
    });

    it('should PLX', function () {
      initMemory([[0x01, 0xff, [0x44]]]);
      testCode(
        [0xfa],
        1,
        {
          sp: 0xfe,
        },
        {
          cycles: 4,
          x: 0x44,
          sp: 0xff,
        },
      );
    });

    it('should PHY', function () {
      testCode(
        [0x5a],
        1,
        {
          y: 0x44,
        },
        {
          cycles: 3,
          sp: 0xfe,
        },
      );
      expectStack([0x44]);
    });

    it('should PLY', function () {
      initMemory([[0x01, 0xff, [0x44]]]);
      testCode(
        [0x7a],
        1,
        {
          sp: 0xfe,
        },
        {
          cycles: 4,
          y: 0x44,
          sp: 0xff,
        },
      );
    });
  });

  describe('#jumps', function () {
    it('should JMP (abs)', function () {
      initMemory([[0x03, 0x33, [0x34, 0x12]]]);
      testCode(
        [0x6c, 0x33, 0x03],
        1,
        {},
        {
          cycles: 6,
          pc: 0x1234,
        },
      );
    });

    it('should JMP (abs) across page boundries without bugs', function () {
      initMemory([
        [0x02, 0xff, [0x34, 0x12]],
        [0x02, 0x00, [0xff]],
      ]);
      testCode(
        [0x6c, 0xff, 0x02],
        1,
        {},
        {
          cycles: 6,
          pc: 0x1234,
        },
      );
    });

    it('should JMP (abs, x)', function () {
      initMemory([[0x03, 0x43, [0x34, 0x12]]]);
      testCode(
        [0x7c, 0x33, 0x03],
        1,
        {
          x: 0x10,
        },
        {
          cycles: 6,
          pc: 0x1234,
        },
      );
    });
  });

  describe('#other addressing mode fixes', function () {
    it('should INC abs,x', function () {
      initMemory([[0x03, 0x043, [0x44]]]);
      testCode(
        [0xfe, 0x33, 0x03],
        1,
        {
          x: 0x10,
        },
        {
          cycles: 7,
        },
      );
      expectMemory([[0x03, 0x43, [0x45]]]);
    });
  });

  describe('#branches', function () {
    it('should BRA forward', function () {
      testCode(
        [0x80, 0x7f],
        1,
        {},
        {
          cycles: 3,
          pc: 0x0481,
        },
      );
    });

    it('should BRA backward', function () {
      testCode(
        [0x80, 0xff],
        1,
        {},
        {
          cycles: 3,
          pc: 0x0401,
        },
      );
    });
  });

  describe('#read memory', function () {
    // ********** (zp)
    it('should LDA (zp)', function () {
      initMemory([
        [0x00, 0x33, [0x33, 0x03]],
        [0x03, 0x33, [0x44]],
      ]);
      testCode(
        [0xb2, 0x33],
        1,
        {},
        {
          cycles: 5,
          a: 0x44,
        },
      );
    });
  });

  describe('#write memory', function () {
    // ********** (zp)
    it('should STA (zp)', function () {
      initMemory([[0x00, 0x33, [0x33, 0x03]]]);
      testCode(
        [0x92, 0x33],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 5,
        },
      );
      expectMemory([[0x03, 0x33, [0x44]]]);
    });

    it('should STZ abs', function () {
      initMemory([[0x03, 0x33, [0x44]]]);
      testCode(
        [0x9c, 0x33, 0x03],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 4,
        },
      );
      expectMemory([[0x03, 0x33, [0x00]]]);
    });
  });

  describe('#logical operators', function () {
    it('should BIT imm and effect other flags', function () {
      testCode(
        [0x89, 0x33],
        1,
        {
          s: flags.X | flags.N,
          a: 0x44,
        },
        {
          cycles: 2,
          s: flags.X | flags.Z | flags.N,
        },
      );
    });

    it('should BIT imm', function () {
      testCode(
        [0x89, 0x33],
        1,
        {
          a: 0x03,
        },
        {
          cycles: 2,
          s: flags.X,
        },
      );
    });

    // ******** TRB
    it('should TRB zp', function () {
      initMemory([[0x00, 0x33, [0x55]]]);
      testCode(
        [0x14, 0x33],
        1,
        {
          a: 0xa5,
        },
        {
          cycles: 5,
        },
      );
      expectMemory([[0x00, 0x33, [0x50]]]);
    });

    it('should TRB abs', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x1c, 0x33, 0x03],
        1,
        {
          a: 0xaa,
        },
        {
          cycles: 6,
          s: flags.X | flags.Z,
        },
      );
      expectMemory([[0x00, 0x33, [0x00]]]);
    });

    // ******** TSB
    it('should TSB zp', function () {
      initMemory([[0x00, 0x33, [0x55]]]);
      testCode(
        [0x04, 0x33],
        1,
        {
          a: 0xa5,
        },
        {
          cycles: 5,
        },
      );
      expectMemory([[0x00, 0x33, [0xf5]]]);
    });

    it('should TSB abs', function () {
      initMemory([[0x03, 0x33, [0x55]]]);
      testCode(
        [0x0c, 0x33, 0x03],
        1,
        {
          a: 0xaa,
        },
        {
          cycles: 6,
          s: flags.X | flags.Z,
        },
      );
      expectMemory([[0x03, 0x33, [0xff]]]);
    });
  });

  describe('Branch bit set/reset', function () {
    // ******** BBR
    it('BBR0 should branch if bit 0 clear', function () {
      initMemory([[0x00, 0x33, [0xfe]]]);
      testCode(
        [0x0f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR0 should branch backward', function () {
      initMemory([[0x00, 0x33, [0xfe]]]);
      testCode(
        [0x0f, 0x33, 0xff],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0402,
        },
      );
    });

    it('BBR1 should branch if bit 1 clear', function () {
      initMemory([[0x00, 0x33, [0xfd]]]);
      testCode(
        [0x1f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR2 should branch if bit 2 clear', function () {
      initMemory([[0x00, 0x33, [0xfb]]]);
      testCode(
        [0x2f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR3 should branch if bit 3 clear', function () {
      initMemory([[0x00, 0x33, [0xf7]]]);
      testCode(
        [0x3f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR4 should branch if bit 4 clear', function () {
      initMemory([[0x00, 0x33, [0xef]]]);
      testCode(
        [0x4f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR5 should branch if bit 5 clear', function () {
      initMemory([[0x00, 0x33, [0xdf]]]);
      testCode(
        [0x5f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR6 should branch if bit 6 clear', function () {
      initMemory([[0x00, 0x33, [0xbf]]]);
      testCode(
        [0x6f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR7 should branch if bit 7 clear', function () {
      initMemory([[0x00, 0x33, [0x7f]]]);
      testCode(
        [0x7f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBR0 should not branch if bit 0 set', function () {
      initMemory([[0x00, 0x33, [0x01]]]);
      testCode(
        [0x0f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBR1 should not branch if bit 1 set', function () {
      initMemory([[0x00, 0x33, [0x02]]]);
      testCode(
        [0x1f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBR2 should not branch if bit 2 set', function () {
      initMemory([[0x00, 0x33, [0x04]]]);
      testCode(
        [0x2f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBR3 should not branch if bit 3 set', function () {
      initMemory([[0x00, 0x33, [0x08]]]);
      testCode(
        [0x3f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBR4 should not branch if bit 4 set', function () {
      initMemory([[0x00, 0x33, [0x10]]]);
      testCode(
        [0x4f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBR5 should not branch if bit 5 set', function () {
      initMemory([[0x00, 0x33, [0x20]]]);
      testCode(
        [0x5f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBR6 should not branch if bit 6 set', function () {
      initMemory([[0x00, 0x33, [0x40]]]);
      testCode(
        [0x6f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBR7 should not branch if bit 7 set', function () {
      initMemory([[0x00, 0x33, [0x80]]]);
      testCode(
        [0x7f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    // ******** BBS
    it('BBS0 should branch if bit 0 set', function () {
      initMemory([[0x00, 0x33, [0x01]]]);
      testCode(
        [0x8f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS0 should branch backward', function () {
      initMemory([[0x00, 0x33, [0x01]]]);
      testCode(
        [0x8f, 0x33, 0xff],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0402,
        },
      );
    });

    it('BBS1 should branch if bit 1 set', function () {
      initMemory([[0x00, 0x33, [0x02]]]);
      testCode(
        [0x9f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS2 should branch if bit 2 set', function () {
      initMemory([[0x00, 0x33, [0x04]]]);
      testCode(
        [0xaf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS3 should branch if bit 3 set', function () {
      initMemory([[0x00, 0x33, [0x08]]]);
      testCode(
        [0xbf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS4 should branch if bit 4 set', function () {
      initMemory([[0x00, 0x33, [0x10]]]);
      testCode(
        [0xcf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS5 should branch if bit 5 set', function () {
      initMemory([[0x00, 0x33, [0x20]]]);
      testCode(
        [0xdf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS6 should branch if bit 6 set', function () {
      initMemory([[0x00, 0x33, [0x40]]]);
      testCode(
        [0xef, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS7 should branch if bit 7 set', function () {
      initMemory([[0x00, 0x33, [0x80]]]);
      testCode(
        [0xff, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0482,
        },
      );
    });

    it('BBS0 should not branch if bit 0 clear', function () {
      initMemory([[0x00, 0x33, [0xfe]]]);
      testCode(
        [0x8f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBS1 should not branch if bit 1 clear', function () {
      initMemory([[0x00, 0x33, [0xfd]]]);
      testCode(
        [0x9f, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBS2 should not branch if bit 2 clear', function () {
      initMemory([[0x00, 0x33, [0xfb]]]);
      testCode(
        [0xaf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBS3 should not branch if bit 3 clear', function () {
      initMemory([[0x00, 0x33, [0xf7]]]);
      testCode(
        [0xbf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBS4 should not branch if bit 4 clear', function () {
      initMemory([[0x00, 0x33, [0xef]]]);
      testCode(
        [0xcf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBS5 should not branch if bit 5 clear', function () {
      initMemory([[0x00, 0x33, [0xdf]]]);
      testCode(
        [0xdf, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBS6 should not branch if bit 6 clear', function () {
      initMemory([[0x00, 0x33, [0xbf]]]);
      testCode(
        [0xef, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });

    it('BBS7 should not branch if bit 7 clear', function () {
      initMemory([[0x00, 0x33, [0x7b]]]);
      testCode(
        [0xff, 0x33, 0x7f],
        1,
        {},
        {
          cycles: 6,
          pc: 0x0403,
        },
      );
    });
  });

  describe('Bit set/reset', function () {
    it('RMB0 should reset bit 0', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x07, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0xfe]]]);
    });

    it('RMB1 should reset bit 1', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x17, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0xfd]]]);
    });

    it('RMB2 should reset bit 2', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x27, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0xfb]]]);
    });

    it('RMB3 should reset bit 3', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x37, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0xf7]]]);
    });

    it('RMB4 should reset bit 4', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x47, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0xef]]]);
    });

    it('RMB5 should reset bit 5', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x57, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0xdf]]]);
    });

    it('RMB6 should reset bit 6', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x67, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0xbf]]]);
    });

    it('RMB7 should reset bit 7', function () {
      initMemory([[0x00, 0x33, [0xff]]]);
      testCode(
        [0x77, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x7f]]]);
    });

    it('SMB0 should set bit 0', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0x87, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x01]]]);
    });

    it('SMB1 should set bit 1', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0x97, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x02]]]);
    });

    it('SMB2 should set bit 2', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0xa7, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x04]]]);
    });

    it('SMB3 should set bit 3', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0xb7, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x08]]]);
    });

    it('SMB4 should set bit 4', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0xc7, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x10]]]);
    });

    it('SMB5 should set bit 5', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0xd7, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x20]]]);
    });

    it('SMB6 should set bit 6', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0xe7, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x40]]]);
    });

    it('SMB7 should set bit 7', function () {
      initMemory([[0x00, 0x33, [0x00]]]);
      testCode(
        [0xf7, 0x33],
        1,
        {},
        {
          cycles: 5,
          pc: 0x0402,
        },
      );
      expectMemory([[0x00, 0x33, [0x80]]]);
    });
  });

  describe('#math', function () {
    // INC A
    it('should INC A', function () {
      testCode(
        [0x1a],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 2,
          a: 0x45,
        },
      );
    });

    // DEC A
    it('should DEC A', function () {
      testCode(
        [0x3a],
        1,
        {
          a: 0x44,
        },
        {
          cycles: 2,
          a: 0x43,
        },
      );
    });
  });
});
