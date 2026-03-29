import os
from typing import AsyncGenerator
from openai import AsyncOpenAI

openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])


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

    return f"""You are an expert npm package advisor. A developer has described what they need, and a semantic search has retrieved the most relevant npm packages from a curated index.

Your job is to recommend the best option(s) from the list below. Do NOT suggest packages outside this list — only recommend what is provided.

---

Developer's request: {query}

Filters:
{filter_block}

Retrieved packages:
{package_block}
---

Instructions:
- Recommend 1-3 packages from the list above that best fit the request.
- For each recommendation, briefly explain why it fits and any tradeoffs.
- If priorities or framework filters were provided, factor them in.
- If no package is a strong fit, say so honestly rather than forcing a recommendation.
- Keep your response concise and practical — this is for a developer who wants to ship, not read an essay.
- Format your response in Markdown with proper blank lines between sections.
- Use bullet points (`-`) for each package recommendation.
- Start each package with `### package-name` as a header.
- Leave a blank line between each package block."""


async def stream_response(
    query: str,
    packages: list[dict],
    framework: str | None = None,
    priorities: list[str] | None = None,
) -> AsyncGenerator[str, None]:
    prompt = build_prompt(query, packages, framework, priorities)

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
