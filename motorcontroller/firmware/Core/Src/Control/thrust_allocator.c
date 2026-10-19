#include "Control/thrust_allocator.h"
#include "allocator_generated.h"

#include <math.h>
#include <stddef.h>

/*
Embedded, you need to call this function in the motor control task. The forces will be put in the input force array.
Probably add some logic related to the status codes.
Read thrust_allocator.h for more info about arguments.
*/

int thrust_allocator_solve(const double tau[6], const double lower[8],
                           const double upper[8], const double x0[8],
                           double forces[8], double *cost)
{
    if (!tau || !lower || !upper || !x0 || !forces || !cost) {
        return THRUST_ALLOCATOR_INVALID_INPUT;
    }
    for (int i = 0; i < 6; ++i) {
        if (!isfinite(tau[i])) return THRUST_ALLOCATOR_INVALID_INPUT;
    }
    for (int i = 0; i < 8; ++i) {
        if (!isfinite(lower[i]) || !isfinite(upper[i]) || !isfinite(x0[i]) ||
            lower[i] > upper[i]) {
            return THRUST_ALLOCATOR_INVALID_INPUT;
        }
    }

    double candidate[8];
    double candidate_cost;
    const casadi_real *arguments[allocator_solve_SZ_ARG] = {
        tau, lower, upper, x0
    };
    casadi_real *results[allocator_solve_SZ_RES] = {
        candidate, &candidate_cost
    };
    casadi_int integer_workspace[
        allocator_solve_SZ_IW > 0 ? allocator_solve_SZ_IW : 1
    ];
    casadi_real real_workspace[
        allocator_solve_SZ_W > 0 ? allocator_solve_SZ_W : 1
    ];

    if (allocator_solve(arguments, results, integer_workspace,
                        real_workspace, 0) != 0) {
        return THRUST_ALLOCATOR_SOLVER_FAILED;
    }

    for (int i = 0; i < 8; ++i) {
        if (!isfinite(candidate[i]) || candidate[i] < lower[i] - 1e-7 ||
            candidate[i] > upper[i] + 1e-7) {
            return THRUST_ALLOCATOR_INVALID_SOLUTION;
        }
    }
    if (!isfinite(candidate_cost)) return THRUST_ALLOCATOR_INVALID_SOLUTION;

    /* Publish outputs only after every check succeeds. */
    for (int i = 0; i < 8; ++i) forces[i] = candidate[i];
    *cost = candidate_cost;
    return THRUST_ALLOCATOR_OK;
}
