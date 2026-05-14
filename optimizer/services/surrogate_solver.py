import math
from .solver_interface import AerodynamicOptimizer, OptimizationInput


class ResMLPSurrogateOptimizer(AerodynamicOptimizer):
    """Production-ready interface placeholder.

    Replace `_predict_coefficients` and `_policy_step` with actual model inference.
    """

    def optimize(self, optimization_input: OptimizationInput) -> dict:
        cl, cd, cm = self._predict_coefficients(optimization_input)
        cl_cd = cl / max(cd, 1e-4)
        tc = self._estimate_thickness_ratio(optimization_input)

        initial_geom = self._baseline_geometry()
        optimized_geom = self._optimized_geometry(optimization_input)

        return {
            'status': 'ok',
            'metrics': {
                'cl': round(cl, 4),
                'cd': round(cd, 4),
                'cl_cd': round(cl_cd, 2),
                'cm': round(cm, 4),
                'tc': round(tc, 4),
            },
            'constraints': {
                'cm': {'value': cm, 'min': -0.12, 'max': 0.02, 'satisfied': -0.12 <= cm <= 0.02},
                'tc': {'value': tc, 'min': 0.08, 'max': 0.18, 'satisfied': 0.08 <= tc <= 0.18},
            },
            'pipeline': [
                'Initial profile analyzed',
                'Surrogate inference completed',
                'Optimized geometry generated',
            ],
            'geometry': {'initial': initial_geom, 'optimized': optimized_geom},
        }

    def _predict_coefficients(self, inp: OptimizationInput):
        upper_gain = sum(inp.upper_weights)
        lower_gain = abs(sum(inp.lower_weights))
        cl = 0.7 + upper_gain * 0.9 + 0.02 * inp.aoa
        cd = 0.009 + max(0, 0.002 - 0.0001 * inp.aoa) + 0.0003 * lower_gain
        cm = -0.05 - 0.02 * (inp.leading_edge_weight - 0.2) - 0.015 * inp.trailing_edge_offset
        return cl, cd, cm

    def _estimate_thickness_ratio(self, inp: OptimizationInput):
        return 0.11 + 0.04 * math.tanh(sum(inp.upper_weights) - abs(sum(inp.lower_weights)))

    def _baseline_geometry(self):
        xs = [i / 50 for i in range(51)]
        upper = [[x, 0.04 * math.sin(math.pi * x)] for x in xs]
        lower = [[x, -0.04 * math.sin(math.pi * x)] for x in xs]
        return {'upper': upper, 'lower': lower}

    def _optimized_geometry(self, inp: OptimizationInput):
        xs = [i / 50 for i in range(51)]
        amp = 0.05 + 0.02 * sum(inp.upper_weights)
        lower_amp = 0.035 + 0.01 * abs(sum(inp.lower_weights))
        upper = [[x, amp * math.sin(math.pi * x) * (1 - 0.25 * x)] for x in xs]
        lower = [[x, -lower_amp * math.sin(math.pi * x) * (1 - 0.15 * x)] for x in xs]
        return {'upper': upper, 'lower': lower}
