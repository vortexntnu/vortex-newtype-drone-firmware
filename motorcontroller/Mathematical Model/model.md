# Optimal thrust allocation and it's model

## 1. Problem Statement

Our AUV is equipped with 8 thrusters. They are controlled and driven in groups of 4 by 2 motorcontrollers and 2 ESCs. Each group is powered by its own battery via a BMS.

- **Objectives:**  
    1. Optimal allocation of thrust
    3. Control of said thrusters to achieve the optimal thrust
    2. Detection of faulty thrusters and reduced thrust

## 2. Assumptions

1.  Electrically commutating ESC with a BLDC motor can be represented as a DC motor powered by a buck converter.
2.  Current drawn by other systems can be considered constant between two measurements.
3.  Battery voltage can be considered constant between two measurements.

## 3. Model Inputs, Outputs and Parameters

### Type explanation
| Type | Explanation |
|---|---|
| State | We can describe it's dynamics with an ODE |
| Pådrag | Self explanatory |
| Measurement | Any variable or state that we can measure directly |
| Estimate | Variable or state that we can't measure directly but can infer from other measurements |
| Constant | Physical value that doesn't change |
| Coefficient | Physical value that is used as a constant |

Note that a multitude of these constants don't have accurate values

### Motorcontroller/ESC variables and constants
| Type | Symbol | Description | Domain | Units |
|---|---|---|---|---|
| Pådrag | $\boldsymbol{d}$ | Duty cycles | $[-1,1]^4$ | % |
| Measurement | $\boldsymbol{\tilde{v}}$ | Thruster voltages |$\mathbb{R}^4$| $\mathrm{V}$ |
| Measurement | $\boldsymbol{\tilde{i}}$ | Thruster current measurements |$\mathbb{R}^4$| $\mathrm{A}$ |
| Measurement | $\boldsymbol{\tilde{N_e}}$ | Thruster eRPM measurements |$\mathbb{R}^4$| $\mathrm{eRPM}$ |
| Measurement | $\tilde{I}_{ESC}$ | Current drawn by the ESC |$\mathbb{R}$| $\mathrm{A}$ |
| Measurement | $\tilde{I}_{Q}$ | Current drawn by MCU |$\mathbb{R}$| $\mathrm{A}$ |
| Constant | $R_L$ | Harness resistance | IDK | $\mathrm{\Omega}$ |

### Thrusters variables and constants
| Type | Symbol | Description | Domain | Units |
|---|---|---|---|---|
| State | $\boldsymbol{\omega}$ | Angular velocities of the four thrusters | $\mathbb{R}^4$ | $\mathrm{rad/s}$ |
| State | $\boldsymbol{i}$ | Thruster currents | $\mathbb{R}^4$ | $\mathrm{A}$ |
| State | $\boldsymbol{x}$ | Complete system state: $\begin{bmatrix} i & \omega \end{bmatrix}^T$| $\mathbb{R}^8$ | $(\mathrm{A},\mathrm{rad/s})$ |
| Constant | $R_M$ | Motor model resistance   | 360 | $\mathrm{m\Omega}$ |
| Constant | $L_M$ | Motor model inductance   | 154 | $\mathrm{\mu H}$ |
| Constant | $K$ | DC machine constant  | $20.3\cdot 10^{-3}$ | $\mathrm{N\cdot s/rad}$ |
| Constant | $I_0$ | No load current | IDK | $\mathrm{A}$ |
| Constant | $N_M$ | Number of pole pairs | $7$ | $\mathrm{}$ |

### Propeller variables and constants
| Type | Symbol | Description | Domain | Units |
|---|---|---|---|---|
| State | $\boldsymbol{\omega}$ | Angular velocities of the four thrusters | $\mathbb{R}^4$ | $\mathrm{rad/s}$ |
| Coefficient | $k_{Tf}$ | Thrust coefficient forward| $3.73\cdot 10^{-4}$ | $\mathrm{N\cdot s^2/rad^2}$ |
| Coefficient | $k_{Tb}$ | Thrust coefficient forward| $2.96\cdot 10^{-4}$ | $\mathrm{N\cdot s^2/rad^2}$ |
| Coefficient | $k_Q$ | Torque Coefficient | $3.73\cdot 10^{-6}$ | $\mathrm{N\cdot m\cdot s^2/rad^2}$ |
| Constant | $b$ | Viscous friction constant | $420\cdot 10^{-9}$ | $\mathrm{N\cdot m\cdot s/rad}$ |
| Constant | $J_M$ | Moment of inertia | $5.85\cdot 10^{-6}$ | $\mathrm{kg\cdot m^2}$ |

### BMS variables and constants
| Type | Symbol | Description | Domain | Units |
|---|---|---|---|---|
| Measurement | $\tilde{V}_{BMS}$ | Measured BMS voltage | $\mathbb{R}$ | $\mathrm{V}$ |
| Measurement | $\tilde{I}_{BMS}$ | Total current draw from BMS | $\mathbb{R}$ | $\mathrm{A}$ |
| Estimate | $\hat{I}_{AUV}$ | Current drawn by the rest of the AUV | $\mathbb{R}$ | $\mathrm{A}$ |
| Coefficient | $V_B$ | Internal battery voltage | $(12, 16)$ | $\mathrm{V}$ |
| Constant | $R_B$ | Battery internal resistance | $5$ | $\mathrm{m\Omega}$ |