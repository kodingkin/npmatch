import os
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI


def get_openai_client() -> AsyncOpenAI:
    """Lazy initialization of OpenAI client."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        api_key = "test-key"
    return AsyncOpenAI(api_key=api_key)


def build_prompt(
    query: str,
    packages: list[dict],
    framework: str | None,
    priorities: list[str] | None,
) -> str:
    package_block = ""
    for i, pkg in enumerate(packages, 1):
        package_block += (
            f"{i}. **{pkg['name']}** (v{pkg['version']})\n"
            f"   Description: {pkg['description']}\n"
            f"   Keywords: {pkg['keywords']}\n"
            f"   URL: {pkg['npm_url']}\n\n"
        )

    filters = []
    if framework:
        filters.append(f"Framework: {framework}")
    if priorities:
        filters.append(f"User priorities: {', '.join(priorities)}")
    filter_block = "\n".join(filters) if filters else "None specified"

    return (
        "You are an expert npm package advisor. A developer has described what "
        "they need, and a semantic search has retrieved the most relevant npm "
        "packages from a curated index.\n"
        "\n"
        "Your job is to recommend the best option(s) from the list below. "
        "Do NOT suggest packages outside this list - only recommend what is "
        "provided.\n"
        "\n"
        "---\n"
        "\n"
        f"Developer's request: {query}\n"
        "\n"
        "Filters:\n"
        f"{filter_block}\n"
        "\n"
        "Retrieved packages:\n"
        f"{package_block}"
        "---\n"
        "\n"
        "Instructions:\n"
        "- Recommend 1-3 packages from the list above that best fit the request.\n"
        "- For each recommendation, briefly explain why it fits and any tradeoffs.\n"
        "- If priorities or framework filters were provided, factor them in.\n"
        "- If no package is a strong fit, say so honestly rather than forcing a "
        "recommendation.\n"
        "- If the request is ambiguous or missing key details, state that there "
        "is not enough information to make a reliable recommendation.\n"
        "- Keep your response concise and practical - this is for a developer "
        "who wants to ship, not read an essay.\n"
        "- Format your response in Markdown with proper blank lines between "
        "sections.\n"
        "- Use bullet points (`-`) for each package recommendation.\n"
        "- Start each package with `### package-name` as a header.\n"
        "- Leave a blank line between each package block."
    )


async def stream_response(
    query: str,
    packages: list[dict],
    framework: str | None = None,
    priorities: list[str] | None = None,
) -> AsyncGenerator[str]:
    prompt = build_prompt(query, packages, framework, priorities)

    openai_client = get_openai_client()

    stream = await openai_client.chat.completions.create(
        model="gpt-4o",
        stream=True,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta is not None:
            yield delta.replace("\n", "\\n")
