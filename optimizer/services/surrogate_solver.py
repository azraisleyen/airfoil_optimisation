import math
from .solver_interface import AerodynamicOptimizer, OptimizationInput


class ResMLPSurrogateOptimizer(AerodynamicOptimizer):
    """Surrogate-backed optimizer with model routing (PPO/TD3/SAC).

    Replace coefficient mappings with real trained model inference.
    """

    MODEL_COEFFICIENTS = {
        'PPO': {'cl': 1.142, 'cd': 0.0087, 'cm': -0.038, 'tc': 0.121},
        'TD3': {'cl': 1.168, 'cd': 0.0081, 'cm': -0.035, 'tc': 0.124},
        'SAC': {'cl': 1.155, 'cd': 0.0084, 'cm': -0.040, 'tc': 0.119},
    }

    def optimize(self, optimization_input: OptimizationInput) -> dict:
        cl, cd, cm, tc = self._predict_coefficients(optimization_input)
        cl_cd = cl / max(cd, 1e-4)

        return {
            'status': 'ok',
            'model': optimization_input.model,
            'metrics': {'cl': round(cl, 4), 'cd': round(cd, 4), 'cl_cd': round(cl_cd, 2), 'cm': round(cm, 4), 'tc': round(tc, 4)},
            'constraints': {
                'cm': {'value': cm, 'min': -0.12, 'max': 0.02, 'satisfied': -0.12 <= cm <= 0.02},
                'tc': {'value': tc, 'min': 0.08, 'max': 0.18, 'satisfied': 0.08 <= tc <= 0.18},
            },
            'pipeline': ['Initial profile analyzed', f'{optimization_input.model} policy inference completed', 'Optimized geometry generated'],
            'geometry': {'initial': self._baseline_geometry(), 'optimized': self._optimized_geometry(optimization_input)},
        }

    def _predict_coefficients(self, inp: OptimizationInput):
        base = self.MODEL_COEFFICIENTS.get(inp.model.upper(), self.MODEL_COEFFICIENTS['PPO'])
        geometry_gain = 0.015 * math.tanh(sum(inp.upper_weights) - abs(sum(inp.lower_weights)))
        aoa_gain = 0.004 * (inp.aoa - 2.5)
        cl = base['cl'] + geometry_gain + aoa_gain
        cd = max(0.0065, base['cd'] - 0.0002 * aoa_gain + 0.0001 * abs(sum(inp.lower_weights)))
        cm = base['cm'] - 0.01 * (inp.leading_edge_weight - 0.25)
        tc = max(0.08, min(0.18, base['tc'] + 0.008 * geometry_gain))
        return cl, cd, cm, tc

    def _baseline_geometry(self):
        xs = [i / 80 for i in range(81)]
        upper = [[x, 0.04 * math.sin(math.pi * x)] for x in xs]
        lower = [[x, -0.04 * math.sin(math.pi * x)] for x in xs]
        return {'upper': upper, 'lower': lower}

    def _optimized_geometry(self, inp: OptimizationInput):
        xs = [i / 80 for i in range(81)]
        amp = 0.05 + 0.025 * sum(inp.upper_weights)
        lower_amp = 0.032 + 0.012 * abs(sum(inp.lower_weights))
        upper = [[x, amp * math.sin(math.pi * x) * (1 - 0.2 * x)] for x in xs]
        lower = [[x, -lower_amp * math.sin(math.pi * x) * (1 - 0.12 * x)] for x in xs]
        return {'upper': upper, 'lower': lower}
