import asyncio
import sys
import traceback

import config
from google.genai import types
import google.genai as genai
from schemas import StatVarMetadata
from utils import split_into_batches


# TODO(gmechali): Consider switching the delay param to a duration type.
async def generate_alt_sentences(
    gemini_client: genai.Client, gemini_config: types.GenerateContentConfig,
    gemini_prompt: str, sv_metadata: list[dict[str, str | list[str]]],
    delay: int) -> list[dict[str, str | list[str]]]:
  """
  Calls the Gemini API to generate alternative sentences for a list of SV metadata.
  Returns the full metadata with alt sentences as a list of dictionaries. If the API call
  fails, retry up to MAX_RETRIES times before returning the original, unmodified sv_metadata.
  """
  await asyncio.sleep(
      delay
  )  # Stagger each parallel Gemini API call by 5 seconds to prevent 429 errors from spiked usage.
  prompt_with_metadata = types.Part.from_text(text=(gemini_prompt +
                                                    str(sv_metadata)))

  model_input = [types.Content(role="user", parts=[prompt_with_metadata])]
  results: list[StatVarMetadata] = []
  batch_start_dcid = sv_metadata[0]["dcid"]

  for attempt in range(config.MAX_RETRIES):
    try:
      # Returns a GenerateContentResponse object, where the .parsed field contains the output from Gemini,
      # formatted as list[StatVarMetadata] as specified by response_schema in gemini_config
      response: types.GenerateContentResponse = await gemini_client.aio.models.generate_content(
          model=config.GEMINI_MODEL, contents=model_input, config=gemini_config)

      results = response.parsed
      if not results:
        raise ValueError("Gemini returned no parsed content (None or empty).")

      return [sv.model_dump() for sv in results]
    except Exception as e:
      # Using print to stderr for GCP Error Reporting
      print(
          f"Error on attempt {attempt + 1}/{config.MAX_RETRIES} for batch starting with {batch_start_dcid}: {e}",
          file=sys.stderr)
      traceback.print_exc()

    if attempt + 1 < config.MAX_RETRIES:
      print(f"Retrying after {config.RETRY_DELAY_SECONDS} seconds...")
      await asyncio.sleep(config.RETRY_DELAY_SECONDS)

  # If all retries fail, log to stderr and return original metadata
  print(
      f"All {config.MAX_RETRIES} retry attempts failed for batch starting with {batch_start_dcid}. Returning original metadata.",
      file=sys.stderr)
  return sv_metadata


async def batch_generate_alt_sentences(
    sv_metadata_list: list[dict[str, str | list[str]]], gemini_api_key: str,
    gemini_prompt: str
) -> tuple[list[dict[str, str | list[str]]], list[dict[str, str | list[str]]]]:
  """
  Separates sv_metadata_list into batches, and executes multiple parallel calls to generate_alt_sentences
  using Gemini and existing SV metadata. Flattens the list of results, and returns the metadata as a list of dictionaries.
  """
  print(
      f"Starting batch generation of alternative sentences for {len(sv_metadata_list)} StatVars..."
  )
  gemini_client = genai.Client(api_key=gemini_api_key)
  gemini_config = types.GenerateContentConfig(
      temperature=config.GEMINI_TEMPERATURE,
      top_p=config.GEMINI_TOP_P,
      seed=config.GEMINI_SEED,
      max_output_tokens=config.GEMINI_MAX_OUTPUT_TOKENS,
      response_mime_type="application/json",
      response_schema=list[StatVarMetadata])
  batched_list: list[list[dict[str, str | list[str]]]] = split_into_batches(
      sv_metadata_list, config.BATCH_SIZE)

  parallel_tasks: list[asyncio.Task] = []
  for index, curr_batch in enumerate(batched_list):
    parallel_tasks.append(
        generate_alt_sentences(gemini_client, gemini_config, gemini_prompt,
                               curr_batch, index * 5))

  batched_results: list[list[dict[str,
                                  str | list[str]]]] = await asyncio.gather(
                                      *parallel_tasks)

  results: list[dict[str, str | list[str]]] = []
  failed_results: list[dict[str, str | list[str]]] = []

  for batch in batched_results:
    if batch and batch[0].get("generatedSentences") is not None:
      results.extend(batch)
    else:
      if batch:
        starting_dcid = batch[0].get("dcid", "UNKNOWN")
        print(
            f"Added failed batch starting at DCID {starting_dcid} to failed results."
        )
      else:
        print("An empty batch was returned from Gemini, marking as failed.")
      failed_results.extend(batch)
  return results, failed_results