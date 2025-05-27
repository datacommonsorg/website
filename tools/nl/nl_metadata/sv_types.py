from dataclasses import dataclass
from dataclasses import field


@dataclass
class StatVarMetadata:
  """
    A dataclass to structure and normalize metadata pulled for statistical variables from the Data Commons API.
    Some static fields are common across all stat vars (i.e. dcid, sentence, measuredProperty, name, populationType, statType),
    whereas constraintProperties are dynamic and can vary for each stat var.
    """

  dcid: str
  sentence: str
  measuredProperty: str = ""
  name: str = ""
  populationType: str = ""
  statType: str = ""
  constraintProperties: dict[str, str] = field(default_factory=dict)
