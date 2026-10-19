"""Generate the standalone C thrust allocator with CasADi's QRQP solver.
Install tools/requirements.txt, edit the geometry and weights, then run this file.
"""

from pathlib import Path

import casadi as ca


# Geometry: each column describes one thruster, numbered 0 through 7.
# Rows are the body-frame x, y and z components. Positions are in meters.
directions = ca.DM([
    [0.70711, 0.0, 0.0, -0.70711, -0.70711, 0.0, 0.0, 0.70711],
    [-0.70711, 0.0, 0.0, -0.70711, 0.70711, 0.0, 0.0, 0.70711],
    [0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0],
])

positions = ca.DM([
    [0.45015, 0.24060, -0.22970, -0.43861, -0.43861, -0.22970, 0.24060, 0.45015],
    [0.305680, 0.313022, 0.313022, 0.305680, -0.305680, -0.313022, -0.313022, -0.305680],
    [0.021736, 0.021736, 0.021736, 0.021736, 0.021736, 0.021736, 0.021736, 0.021736],
])

center_of_mass = ca.DM([0.0, 0.0, 0.025])

# W penalizes thruster effort. Q penalizes requested-wrench error.
W = ca.diag(ca.DM([1.0] * 8))
Q = ca.diag(ca.DM([2000.0] * 6))


def build_thrust_matrix(directions, positions, center_of_mass):
    """Return T, mapping eight thruster forces to six wrench components."""
    # Desired equation: T @ f = tau
    #
    #         [d_x,0  d_x,1  ...  d_x,7]
    #         [d_y,0  d_y,1  ...  d_y,7]
    #     T = [d_z,0  d_z,1  ...  d_z,7]    (6 x 8)
    #         [m_x,0  m_x,1  ...  m_x,7]
    #         [m_y,0  m_y,1  ...  m_y,7]
    #         [m_z,0  m_z,1  ...  m_z,7]
    #
    #     f   = [f_0, f_1, ..., f_7]^T             (8 x 1, thrust forces in N)
    #     tau = [F_x, F_y, F_z, M_x, M_y, M_z]^T   (6 x 1, forces and torques)
    #
    # Each column i is [d_i; m_i], with m_i = r_i cross d_i and
    # r_i = position_i - center_of_mass. Torques are about the center of mass.
    T = ca.DM.zeros(6, 8)

    for i in range(8):
        direction = directions[:, i]
        lever_arm = positions[:, i] - center_of_mass
        T[0:3, i] = direction
        T[3:6, i] = ca.cross(lever_arm, direction)

    return T


def build_allocator(T, W, Q):
    """Return the CasADi allocator function, ready for C generation."""
    # QP form: minimize 0.5*f.T*H*f + g.T*f, with lower <= f <= upper.
    H = W + T.T @ Q @ T

    # These symbolic values become inputs to the generated C function.
    tau = ca.MX.sym("tau", 6)
    lower = ca.MX.sym("lower", 8)
    upper = ca.MX.sym("upper", 8)
    x0 = ca.MX.sym("x0", 8)
    g = -(T.T @ Q @ tau)

    # Scaling the entire objective preserves its minimizer and improves numerics.
    scale = max(1.0, float(ca.norm_inf(H)))

    options = {
        "max_iter": 1000,
        "error_on_fail": True,
        "print_header": False,
        "print_iter": False,
        "print_info": False,
        "print_lincomb": False,
        "print_time": False,
        "verbose": False,
    }

    solver = ca.conic("allocator_qp", "qrqp", {"h": H.sparsity()}, options)
    result = solver(h=H / scale, g=g / scale, lbx=lower, ubx=upper, x0=x0)
    forces = result["x"]

    # This produces a nonzero C return code if a solver result violates bounds.
    within_bounds = ca.logic_and(forces >= lower - 1e-7, forces <= upper + 1e-7)
    forces = forces.attachAssert(
        ca.sum1(within_bounds) == 8,
        "Solver returned forces outside their bounds",
    )

    # Return the original unscaled cost, including its constant term.
    error = T @ forces - tau
    cost = 0.5 * (forces.T @ W @ forces + error.T @ Q @ error)

    return ca.Function(
        "allocator_solve",
        [tau, lower, upper, x0],
        [forces, cost],
        ["tau", "lower", "upper", "x0"],
        ["forces", "cost"],
    )

# There is a bug in QRQP solver...
def patch_qrqp_termination(source_file):
    """Prevent QRQP from reporting success while residuals exceed tolerance."""
    source = source_file.read_text()
    old = """  casadi_qrqp_factorize(d);
  if (!d->sing && d->index == -1) {"""
    new = """  casadi_qrqp_factorize(d);
  /* CasADi 3.7.2 QRQP fix: success requires primal and dual convergence. */
  if (!d->sing && d->index == -1 &&
      d->pr < p->constr_viol_tol && d->du < p->dual_inf_tol) {"""

    if source.count(old) != 1:
        raise RuntimeError("Expected QRQP termination code was not found exactly once")

    source_file.write_text(source.replace(old, new))


def generate_code(allocator, output_directory):
    """Generate standalone C and apply the verified QRQP correction."""
    output_directory.mkdir(parents=True, exist_ok=True)
    generator = ca.CodeGenerator("allocator_generated.c", {
        "with_header": True,
        "casadi_real": "double",
        "casadi_int": "int",
    })
    generator.add(allocator)
    generator.generate(str(output_directory) + "/")
    patch_qrqp_termination(output_directory / "allocator_generated.c")
    print("Generated and patched files in:", output_directory)


def run_example(allocator):
    """Run one numerical request and print the allocated forces and cost."""
    sample = allocator(
        tau=[10.0, 0.0, -5.0, 0.0, 0.0, 2.0],
        lower=[-41.0] * 8,
        upper=[39.0] * 8,
        x0=[0.0] * 8,
    )
    print("Sample forces:", sample["forces"])
    print("Sample cost:", sample["cost"])


def main():
    """Build the allocator, generate its C files, and run the example."""
    T = build_thrust_matrix(directions, positions, center_of_mass)
    allocator = build_allocator(T, W, Q)
    output_directory = (Path(__file__).resolve().parent.parent
                        / "firmware/Core/Src/Control")
    generate_code(allocator, output_directory)
    run_example(allocator)


if __name__ == "__main__":
    main()
