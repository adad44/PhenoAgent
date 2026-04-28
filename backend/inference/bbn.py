from __future__ import annotations

import math
from typing import Literal

from inference.features import risk_input_completeness
from inference.priors import DOMAIN_WEIGHTS, RISK_STATE_PRIOR
from models.schemas import RiskPosterior

State = Literal["low", "normal", "high", "critical"]

STATE_SCORE = {"low": -0.35, "normal": 0.0, "high": 1.0, "critical": 1.8}


class PhenoBayesianNetwork:
    """Compact BBN-style risk engine.

    pgmpy is included as a dependency for production expansion. This MVP keeps the
    CPT logic explicit and deterministic so tests and the demo flow do not need a
    large external population table.
    """

    def infer(self, evidence: dict[str, State | str]) -> tuple[dict[str, RiskPosterior], dict[str, tuple[float, float]]]:
        posteriors: dict[str, RiskPosterior] = {}
        intervals: dict[str, tuple[float, float]] = {}

        for domain, weights in DOMAIN_WEIGHTS.items():
            weighted_score = 0.0
            max_score = sum(weights.values()) * STATE_SCORE["critical"]
            observed_weight = 0.0
            for node, weight in weights.items():
                state = str(evidence.get(node, "normal"))
                weighted_score += STATE_SCORE.get(state, 0.0) * weight
                if node in evidence:
                    observed_weight += weight

            normalized = max(0.0, min(1.0, weighted_score / max_score if max_score else 0.0))
            completeness = risk_input_completeness(evidence, list(weights))
            posterior = self._posterior_from_score(normalized, completeness)
            posteriors[domain] = posterior
            high_or_critical = posterior.high + posterior.critical
            margin = max(0.05, 0.2 * (1.0 - completeness))
            intervals[domain] = (max(0.0, high_or_critical - margin), min(1.0, high_or_critical + margin))

        return posteriors, intervals

    def _posterior_from_score(self, score: float, completeness: float) -> RiskPosterior:
        low = max(0.02, 0.42 * (1 - score))
        normal = max(0.05, 0.48 * (1 - abs(score - 0.35)))
        high = max(0.02, 0.15 + 0.55 * score)
        critical = max(0.01, 0.03 + 0.35 * max(0.0, score - 0.55))

        prior_blend = 0.35 * (1.0 - completeness)
        raw = {
            "low": (1 - prior_blend) * low + prior_blend * RISK_STATE_PRIOR["low"],
            "normal": (1 - prior_blend) * normal + prior_blend * RISK_STATE_PRIOR["normal"],
            "high": (1 - prior_blend) * high + prior_blend * RISK_STATE_PRIOR["high"],
            "critical": (1 - prior_blend) * critical + prior_blend * RISK_STATE_PRIOR["critical"],
        }
        total = math.fsum(raw.values())
        return RiskPosterior(**{state: value / total for state, value in raw.items()})


def run_bbn_inference(evidence: dict[str, str]) -> tuple[dict[str, RiskPosterior], dict[str, tuple[float, float]]]:
    return PhenoBayesianNetwork().infer(evidence)
