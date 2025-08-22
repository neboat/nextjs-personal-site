# Examples for Lecture: What Compilers Can and Cannot Do

This document contains several examples demonstrating how the compiler optimizes code.

Unless otherwise specified, these examples use Compiler Explorer configured to use `x86-64 clang 16.0.0` with `-O1` optimizations.

Links are given to preconfigured instances of Compiler Explorer for these examples.  Alternatively, you can configure Compiler Explorer yourself to examine these C source codes and their corresponding LLVM IR and x86-64 assembly outputs.

## Inlining

Example in Compiler Explorer: <https://godbolt.org/z/ejh81T4PY>

Examine how function inlining affects the LLVM IR of this example.

```c
double square(double x) {
  return x*x;
}

double sum_of_squares(double *A, int n) {
  double sum = 0.0;
  for (int i = 0; i < n; ++i) {
    sum += square(A[i]);
  }
  return sum;
}
```

## Hoisting

Example in Compiler Explorer: <https://godbolt.org/z/EMKecKhds>

Does the compiler hoist the `exp(sqrt(M_PI/2))` computation out of this loop?

```c
#include <math.h>
 
void scale(double *X, double *Y, int N) {
  for (int i = 0; i < N; i++) {
    Y[i] = X[i] * exp(sqrt(M_PI/2));
  }
}
```

Does the compiler hoist the `exp(sqrt(M_PI/N))` computation out of this loop?

```c
#include <math.h>
 
void scale(double *X, double *Y, int N) {
  for (int i = 0; i < N; i++) {
    Y[i] = X[i] * exp(sqrt(M_PI/N));
  }
}
```

What happens if you use `-ffast-math`?

## Combining tests

Example in Compiler Explorer: <https://godbolt.org/z/PG9557hz8>

How well does the compiler optimize the branches in this example?

```c
void full_add(int a, 
              int b, 
              int c, 
              int *sum, 
              int *carry) {
  if (a == 0) {
    if (b == 0) {
      if (c == 0) {
        *sum = 0;
        *carry = 0;
      } else {
        *sum = 1;
        *carry = 0;
      } 
    } else {
      if (c == 0) {
        *sum = 1;
        *carry = 0;
      } else {
        *sum = 0;
        *carry = 1;
      } 
    }
  } else {
    if (b == 0) {
      if (c == 0) {
        *sum = 1;
        *carry = 0;
      } else {
        *sum = 0;
        *carry = 1;
      } 
    } else {
      if (c == 0) {
        *sum = 0;
        *carry = 1;
      } else {
        *sum = 1;
        *carry = 1;
      } 
    }
  }
}
```

How does the compiler implement and optimize this code in contrast?

```c
void full_add_2(int a, 
                int b, 
                int c, 
                int *sum, 
                int *carry) {
  int test = ((a == 1) << 2) 
             | ((b == 1) << 1) 
             | (c == 1);
  switch(test) {
    case 0:
      *sum = 0;
      *carry = 0;
      break;
    case 1:
      *sum = 1;
      *carry = 0;
      break;
    case 2:
      *sum = 1;
      *carry = 0;
      break;
    case 3:
      *sum = 0;
      *carry = 1;
      break;
    case 4:
      *sum = 1;
      *carry = 0;
      break;
    case 5:
      *sum = 0;
      *carry = 1;
      break;
    case 6:
      *sum = 0;
      *carry = 1;
      break;
    case 7:
      *sum = 1;
      *carry = 1;
      break;
  } 
}
```

## Loop unswitching

Example in Compiler Explorer: <https://godbolt.org/z/qd9Wo1xT7>

For this example, you will need to use optimization level `-O3`.

How does the compiler optimize this code?

```c
#include <stdbool.h>
#include <stdio.h>

void vecsum(double *restrict Y, const double *restrict X, int n, bool debug) {
    for (int i = 0; i < n; ++i) {
        if (debug) {
            printf("Y[%d] = %f\n", i, Y[i]);
        }
        Y[i] += X[i];
    }
}
```

## Arithmetic series

Example in Compiler Explorer: <https://godbolt.org/z/j3vjosPz5>

How does the compiler optimize this loop?

```c
int arithseries(int n) {
    int sum = 0;
    for (int i = 0; i < n; ++i) {
        sum += i * i;
    }
    return sum;
}
```

## Assembly-level optimizations

Example in Compiler Explorer: <https://godbolt.org/z/Wj1v1jYYq>

While most optimizations appear at the LLVM IR level, some are done on the assembly code.

Look at the assembly output for each of these test cases to see how these arithmetic operations are optimized.  In contrast, the LLVM IR for these test cases show relatively minimal optimization.

```c
#include <stdint.h>

uint32_t test1(uint32_t n) {
    return n * 8;
}

uint32_t test2(uint32_t n) {
    return n * 15;
}

uint32_t test3(uint32_t n) {
    return n / 71;
}
```

## Inlining versus hoisting

Example in Compiler Explorer: <https://godbolt.org/z/K371fT5bf>

The order of compiler passes is determined heuristically and it doesn't always produce the best result.

For this example, you will need to use compiler flags `-O1 -ffast-math`.

How does the compiler optimize this example?  How does it optimize it if you uncomment the `__attribute__((noinline))` on the `norm()` function, to disable inlining of that function?  Which version do you think is faster?

```c
#include <math.h>

// __attribute__((noinline))
double norm(const double *A, int n) {
  double sum = 0.0;
  for (int i = 0; i < n; ++i) {
    sum += A[i] * A[i];
  }
  return sqrt(sum);
}

void normalize(double *restrict Y, const double *restrict X, int n) {
  for (int i = 0; i < n; ++i) {
    Y[i] += X[i] / norm(X, n);
  }
}
```

## Case study: N-body simulation

Example in Compiler Explorer: <https://godbolt.org/z/3WGY6K3P1>

Use "Opt Pipeline Viewer" in Compiler Explorer to examine how the compiler iteratively optimizes the different subroutines in this example.

```c
#include <stdlib.h>

typedef struct vec_t {
  double x, y;
} vec_t;

static vec_t vec_add(vec_t a, vec_t b) {
  vec_t sum = { a.x + b.x, a.y + b.y };
  return sum;
}

static vec_t vec_scale(vec_t v, double a) {
  vec_t scaled = { v.x * a, v.y * a };
  return scaled;
}

typedef struct body_t {
  // Position vector
  vec_t position;
  // Velocity vector
  vec_t velocity;
  // Force vector
  vec_t force;
  // Mass
  double mass;
} body_t;

void update_positions(int nbodies,
                      body_t *bodies,
                      double time_quantum) {
  for (int i = 0; i < nbodies; ++i) {
    // Compute the new velocity of ith body.
    vec_t new_velocity =
      vec_scale(bodies[i].force,
                time_quantum / bodies[i].mass);
    // Update the position of ith body based on
    // the average of its old and new velocity.
    bodies[i].position =
      vec_add(bodies[i].position,
              vec_scale(vec_add(bodies[i].velocity,
                                new_velocity),
                        time_quantum / 2.0));
    // Set the new velocity of ith body.
    bodies[i].velocity = new_velocity;
  }
}
```
