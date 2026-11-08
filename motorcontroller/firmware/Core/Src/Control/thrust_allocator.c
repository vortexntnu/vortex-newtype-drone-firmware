#include "Control/thrust_allocator.h"
#include "allocator_generated.h"

#include <math.h>
#include <stddef.h>

AllocatorStatus thrust_allocator_solve(const AllocatorInputs *inputs,
                                       double forces[8], double *cost)
{
    if (!inputs || !forces || !cost) {
        return THRUST_ALLOCATOR_INVALID_INPUT;
    }
    for (int i = 0; i < 6; ++i) {
        if (!isfinite(inputs->tau[i])) return THRUST_ALLOCATOR_INVALID_INPUT;
    }
    for (int i = 0; i < 8; ++i) {
        if (!isfinite(inputs->lower_force_bound[i]) || !isfinite(inputs->upper_force_bound[i]) ||
            !isfinite(inputs->x0[i]) || inputs->lower_force_bound[i] > inputs->upper_force_bound[i]) {
            return THRUST_ALLOCATOR_INVALID_INPUT;
        }
    }

    double candidate[8];
    double candidate_cost;
    const casadi_real *arguments[allocator_solve_SZ_ARG] = {
        inputs->tau, inputs->lower_force_bound, inputs->upper_force_bound, inputs->x0
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
        if (!isfinite(candidate[i]) || candidate[i] < inputs->lower_force_bound[i] - 1e-7 ||
            candidate[i] > inputs->upper_force_bound[i] + 1e-7) {
            return THRUST_ALLOCATOR_INVALID_SOLUTION;
        }
    }
    if (!isfinite(candidate_cost)) return THRUST_ALLOCATOR_INVALID_SOLUTION;

    /* Publish outputs only after every check succeeds. */
    for (int i = 0; i < 8; ++i) forces[i] = candidate[i];
    *cost = candidate_cost;
    return THRUST_ALLOCATOR_OK;
}
