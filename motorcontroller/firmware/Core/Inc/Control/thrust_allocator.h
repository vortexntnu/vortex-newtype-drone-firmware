#ifndef THRUST_ALLOCATOR_H
#define THRUST_ALLOCATOR_H

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    THRUST_ALLOCATOR_OK = 0,
    THRUST_ALLOCATOR_INVALID_INPUT = 1,
    THRUST_ALLOCATOR_SOLVER_FAILED = 2,
    THRUST_ALLOCATOR_INVALID_SOLUTION = 3
} AllocatorStatus;

typedef struct {
    double tau[6];
    double lower_force_bound[8];
    double upper_force_bound[8];
    double x0[8];
} AllocatorInputs;

/*
 * Allocate thrust for tau = [Fx,Fy,Fz,Tx,Ty,Tz] in N and N*m.
 * forces (N) and cost are output parameters, written only on success.
 * x0 is the initial guess, usually the previous forces.
 */
AllocatorStatus thrust_allocator_solve(const AllocatorInputs *inputs,
                                       double forces[8], double *cost);

#ifdef __cplusplus
}
#endif

#endif
