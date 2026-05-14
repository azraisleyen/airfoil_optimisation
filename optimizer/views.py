import json
from django.http import JsonResponse
from django.shortcuts import render
from django.views import View
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

from .services.solver_interface import OptimizationInput
from .services.surrogate_solver import ResMLPSurrogateOptimizer


class DashboardView(View):
    def get(self, request):
        return render(request, 'optimizer/dashboard.html')


@csrf_exempt
@require_POST
def optimize_airfoil(request):
    payload = json.loads(request.body)
    data = OptimizationInput(
        aoa=float(payload['aoa']),
        reynolds=float(payload['reynolds']),
        upper_weights=[float(v) for v in payload['upper_weights']],
        lower_weights=[float(v) for v in payload['lower_weights']],
        leading_edge_weight=float(payload['leading_edge_weight']),
        trailing_edge_offset=float(payload['trailing_edge_offset']),
    )
    result = ResMLPSurrogateOptimizer().optimize(data)
    return JsonResponse(result)
