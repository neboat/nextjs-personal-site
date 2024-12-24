# C to Assembly

This document contains instructions and code examples for following along with the Compiler Explorer live-coding demo for the "C to Assembly" lecture.

## Setup Compiler Explorer

### Quick setup

Go to the preconfigured environment here: <https://godbolt.org/z/xKhj73bdK>.  Adjust the panels, font size, and colors to your liking.

### Manual setup (optional)

If the quick-setup link doesn't work, you can configure Compiler Explorer yourself as follows:

- Go to <https://godbolt.org/>.
- Select `C` as the language.
- Select `x86-64 clang 16.0.0` as the compiler.
- Set the optimization flags to `-O1 -fno-omit-frame-pointer -fno-optimize-sibling-calls`.
- Under the "gear" drop-down menu in the assembly panel, deselect "Intel asm syntax."
- Under the "plus" drop-down menu in the assembly panel, select "LLVM IR."
- Drag the panels around so the "C source," "LLVM IR Viewer," and assembly panels are all visible.

### Notes

For this lecture, there are several parts of the LLVM IR output you can safely ignore:

- The `dso_local` and `local_unnamed_addr` annotations, which are used for linking.
- The `noundef` attribute and `nsw` flag, which maintain information for compiler ptimization.
- The `@llvm.dbg.value` function declaration at the bottom, which is used for managing debug information.

**Warning: Do not close the assembly panel.**

- Doing so will disable compilation of the C code in Compiler Explorer.
- If you accidentally close the assembly panel, setup Compiler Explorer again by following the setup instructions.

## Basics of using Compiler Explorer

To use Compiler Explorer, enter C code of interest into the "C source" panel.  Compiler Explorer will automatically compile that code and populate the LLVM IR and assembly panels with the result.

- Compiler Explorer will highlight corresponding lines in all three panels.
- Try hovering over different parts of the C source, LLVM IR, and assembly instructions to highlight corresponding parts in the other outputs.

## Example 1: Functions

Enter the following C code into Compiler Explorer:

```c
#include <stdlib.h>

int64_t fib(int64_t n) {
  return n;
}
```

Examine the function `@fib` in LLVM IR, which has the following header:

```llvm
define dso_local i64 @fib(i64 noundef %n) local_unnamed_addr {
```

## Example 2: Straight-line C code

Enter the following C code into Compiler Explorer:

```c
#include <stdint.h>

int64_t fib(int64_t n) {
    return
        fib(n-1)
        +
        fib(n-2);
}
```

Examine the sequence of `add` and `call` instructions now inside the `@fib` function.

*Exercise:* How do those lines of LLVM IR implement the C code?  For example, in what order are the different expressions in the C statement evaluated?

## Example 3: Basic blocks, control-flow graphs (CFGs), and static single assignment (SSA)

Enter the following C code into Compiler Explorer:

```c
#include <stdint.h>

int64_t fib(int64_t n) {
    if (n < 2) return n;
    return
        fib(n-1)
        +
        fib(n-2);
}
```

Examine the following new features of the `@fib` function:

- Basic blocks labeled `entry`, `if.end`, and `return`.
- Conditional and unconditional branch instructions, `br`, on lines 4 and 12.
- The `phi` instruction on line 15.

To see the control-flow graph (CFG) of this function, click "Control Flow Graph" in the LLVM IR tab.

*Exercise:* How do these basic blocks and branch instructions implement the control flow in this function?

## From LLVM IR to assembly

Examine the LLVM IR and assembly outputs side-by-side.

To see documentation about X86 assembly instructions:

- Right-click on the assembly opcode you want to know more about.
- Select "View assembly documentation" in the pop-up menu.

To view the CFG in assembly:

- Under the "plus" drop-down menu in the assembly panel, click "Control Flow Graph".
- Notice the similarity of the CFGs in LLVM IR and assembly.

*Exercise:* What registers does the final assembly use to implement this function?  Which registers are caller saved and which are callee saved?

*Exercise:* How does the assembly code ensure that the return value ends up in `%rax` on all control-flow paths in this function?

*Exercise:* Could the compiler have optimized away the use of `%rbp` for this function?  Why or why not?

*Exercise:* Why might the compiler have decided to use just one `ret` instruction to implement `fib`?  What impact does that decision have on the final assembly?

### Linux x86-64 calling convention (cheat sheet)

#### C linkage for x86-64 general-purpose registers

| C linkage | 64-bit name |
| --------- | ----------- |
| Return value | `%rax` |
| Callee saved | `%rbx` |
| 4th argument | `%rcx` |
| 3rd argument | `%rdx` |
| 2nd argument | `%rsi` |
| 1st argument | `%rdi` |
| Base pointer | `%rbp` |
| Stack pointer | `%rsp` |
| 5th argument | `%r8` |
| 6th argument | `%r9` |
| Callee saved | `%r10` |
| For linking | `%r11` |
| Callee saved | `%r12` |
| Callee saved | `%r13` |
| Callee saved | `%r14` |
| Callee saved | `%r15` |

#### Function prologue

1. Enter the new function frame:

    ```asm
    pushq %rbp
    movq %rsp, %rbp
    ```

2. Save callee-saved registers on the stack.

#### Function epilogue

1. Restore callee-saved registers from the stack.
2. Exit the function:

    ```asm
    popq %rbp
    ret
    ```

## (Optional) Example 4: Loops and memory

Enter the following C code into Compiler Explorer:

```c
#include <stdint.h>

void dax(double *y, double a, double *x, int64_t n) {
    for (int64_t i = 0; i < n; ++i)
        y[i] = a * x[i];
}
```

Observe the following features in LLVM IR:

- The CFG contains a loop that corresponds with the loop in the C code.
- The `load` and `store` instructions read and write memory.
- The `getelementptr` instruction computes addresses in memory.

## (Optional) Example 5: Attributes

Enter the following C code into Compiler Explorer:

```c
#include <stdint.h>

void dax(double *restrict y, double a, double *restrict x, int64_t n) {
    for (int64_t i = 0; i < n; ++i)
        y[i] = a * x[i];
}
```

Observe the various attributes on the parameters in the function header, including the following:

- The `writeonly` and `readonly` attributes --- derived by compiler analysis --- indicate that memory accessed through the corresponding pointer is only written or read, respectively.
- The `noalias` attribute --- derived from the `restrict` C keyword --- indicates that memory accessed through the corresponding pointer will not alias memory accessed through other pointers.

**Note:** The `restrict` keyword is a C keyword.  The corresponding keyword in C++ is `__restrict__`.

## (Optional) Example 6: Vector instructions and vector types

Change the optimization flags in Compiler Explorer to `-O2`.

Observe the following features of the LLVM IR:

- The code uses a ***vector type***, `<2 x double>`, that stores two elements of base type `double`.
- The code uses the `insertelement` and `shufflevector` instructions that operate specifically on vectors.

## (Optional) Example 7: How does LLVM optimize code?

You can use Compiler Explorer to directly view LLVM's optimization pipeline and the effect of each pipeline pass.

- Under the "plus" drop-down menu in the assembly panel, click "Opt Pipeline".  This will create a new "Opt Pipeline Viewer" panel.
- Select different optimizations in the list of passes to see the changes made by each pass.
- To hide passes that have no effect on this code, select the "Filters" drop-down menu in the "Opt Pipeline Viewer" panel and select "Hide Inconsequential Passes."

## References

Compiler Explorer: <https://godbolt.org/>

LLVM Language Reference Manual: <https://releases.llvm.org/16.0.0/docs/LangRef.html>

Quick reference on X86 instructions: <https://en.wikipedia.org/wiki/X86_instruction_listings>

Quick reference on calling conventions: <https://wiki.osdev.org/Calling_Conventions>

System V Application Binary Interface: see course website.
