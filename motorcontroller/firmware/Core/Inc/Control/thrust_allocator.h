#ifndef THRUST_ALLOCATOR_H
#define THRUST_ALLOCATOR_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
    THRUST_ALLOCATOR_OK = 0,
    THRUST_ALLOCATOR_INVALID_INPUT = 1,
    THRUST_ALLOCATOR_SOLVER_FAILED = 2,
    THRUST_ALLOCATOR_INVALID_SOLUTION = 3
};

/*
 * Allocate eight thrust forces in N for tau = [Fx,Fy,Fz,Tx,Ty,Tz] in N and N*m.
 * Wrench components and thruster order match the generator's geometry.
 * All pointers are required. tau has 6 elements, all other arrays have 8.
 * x0 is the initial guess, we use the previous thrust forces if available.
 * Inputs must be finite and lower[i] <= upper[i].
 * Returns THRUST_ALLOCATOR_OK only after checking solver status and outputs.
 * On failure, forces and *cost remain unchanged. The caller chooses its fallback.
 * The generated solver workspace is allocated on the calling task's stack.
 */
int thrust_allocator_solve(const double tau[6],
                           const double lower[8],
                           const double upper[8],
                           const double x0[8],
                           double forces[8],
                           double *cost);

#ifdef __cplusplus
}
#endif

#endif
