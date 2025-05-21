"""Retrieve metadata and add to the existing embeddings."""
from datacommons_client.client import DataCommonsClient
import pandas as pd


def main():
  client = DataCommonsClient()
  embeddings = pd.read_csv("tools/nl/embeddings/input/base/sheets_svs.csv")

  # Extract common metadata properties from all StatVars
  properties_to_extract = [
      "measuredProperty", "name", "populationType", "statType"
  ]
  new_embeddings = []
  batch_size = 100

  for i in range(0, len(embeddings), batch_size):
    curr_batch = embeddings.iloc[i:i + batch_size]
    curr_dcids = curr_batch['dcid'].tolist()

    response = client.node.fetch(node_dcids=curr_dcids, expression="->*")
    response_data = response.to_dict().get("data", {})

    for dcid, sentence in zip(*curr_batch.to_dict("list").values()):
      new_row = {
          "dcid": dcid,
          "sentence": sentence,
          "constraintProperties":
              ''  # Initialize constraintProperties here since it cannot be natively extracted
      }
      dcid_data = response_data[dcid]["arcs"]

      for property in properties_to_extract:
        new_row[property] = ''
        # Property values are encoded as an array of nodes - take the first node as the value
        first_node = dcid_data[property]["nodes"][0]

        if property == "name":  # For the "name" property, the node field is "value"
          new_row[property] = first_node.get("value")
        else:  # For other properties, the node field is "name"
          new_row[property] = first_node.get("name")

      if "constraintProperties" in dcid_data:
        curr_constraint_properties = []

        for node in dcid_data["constraintProperties"]["nodes"]:
          # Use the "name" field if it exists, otherwise fall back on "dcid"
          # Some constraintProperties nodes have both "name" and "dcid", others only have "dcid"
          if "name" in node:
            constrained_prop = node["name"]
          else:
            constrained_prop = node["dcid"]

          first_node = dcid_data[constrained_prop]["nodes"][0]
          if "name" in first_node:
            curr_constraint_properties.append(
                f'{constrained_prop}={first_node.get("name")}')
          else:
            curr_constraint_properties.append(
                f'{constrained_prop}={first_node.get("dcid")}')

        new_row["constraintProperties"] = ";".join(curr_constraint_properties)

      new_embeddings.append(new_row)

  new_embeddings_df = pd.DataFrame(new_embeddings)
  new_embeddings_df.to_csv("tools/nl/nl_metadata/alyssaguo_statvars.csv",
                           index=False)


if __name__ == "__main__":
  main()
