from dc_tool import ask_data_commons
from fact_checker import FactChecker
from vertex_ai_llm_provider import VertexAIProvider
from open_ai_llm_provider import OpenAIProvider
from anthropic_llm_provider import AnthropicProvider
import argparse

QUERY = "What is the Nominal GDP of italy?"

def main():
    llm_provider = None
    if args.llm_provider == "gemini":
        llm_provider = VertexAIProvider(project_id="datcom-website-dev", location="us-central1")
    elif args.llm_provider == "openai":
        llm_provider = OpenAIProvider()
    elif args.llm_provider == "anthropic":
        llm_provider = AnthropicProvider()
    print(f"Using LLM Provider: {type(llm_provider).__name__}")

    checker = FactChecker(llm_provider)

    if args.generate_claims:
        print("Generating claims...")
        checker.generate_and_verify_claims(QUERY)
    else:
        print("Ingesting claims from file...")
        checker.ingest_and_verify_claims()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="A script that processes an input file and optionally writes to an output file."
    )
    parser.add_argument(
        "--llm_provider",
        type=str,
        choices=["gemini", "openai", "anthropic"],
        default="gemini",
        help="The LLM provider to use for fact checking."
    )
    parser.add_argument(
        "--generate_claims",
        type=bool,
        default=True,
        help="Whether to generate claims from the LLM or ingest from file."
    )
    parser.add_argument(
        "--query",
        type=str,
        default=QUERY,
        help="The query to use for fact checking."
    )
    args = parser.parse_args()
    main()