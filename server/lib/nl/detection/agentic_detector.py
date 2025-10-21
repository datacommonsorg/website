from server.lib.nl.common import utterance
from server.lib.nl.common.counters import Counters
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import DetectionArgs
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from shared.lib.detected_variables import MultiVarCandidates
from shared.lib.detected_variables import VarCandidates


def detect(query: str, prev_utterance: utterance.Utterance,
           query_detection_debug_logs: dict, counters: Counters,
           dargs: DetectionArgs) -> Detection:

  empty_place_detection = PlaceDetection(
      query_original=query,
      query_without_place_substr="",
      query_places_mentioned=[],
      query_entities_mentioned=[],
      places_found=[],
      entities_found=[],
      main_place=Place(dcid="", name="", place_type=""),
  )
  empty_svs_detection = SVDetection(query=query,
                                    single_sv=VarCandidates(svs=[],
                                                            scores=[],
                                                            sv2sentences={}),
                                    prop=VarCandidates(svs=[],
                                                       scores=[],
                                                       sv2sentences={}),
                                    multi_sv=MultiVarCandidates(candidates=[]),
                                    sv_threshold=0.0,
                                    model_threshold=0.0)

  return Detection(original_query=query,
                   cleaned_query=query,
                   places_detected=empty_place_detection,
                   svs_detected=empty_svs_detection,
                   classifications=[],
                   llm_resp={},
                   detector=ActualDetectorType.Agentic)
