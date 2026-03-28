import os
from openai import AsyncOpenAI
from pinecone import Pinecone

openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

_pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
_index = _pc.Index(os.environ.get("PINECONE_INDEX_NAME", "npmatch"))


async def embed_query(text: str) -> list[float]:
    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def vector_search(embedding: list[float], top_k: int = 5) -> list[dict]:
    results = _index.query(
        vector=embedding,
        top_k=top_k,
        include_metadata=True,
    )

    packages = []
    for match in results.matches:
        meta = match.metadata or {}
        name = meta.get("name", "")
        packages.append(
            {
                "name": name,
                "description": meta.get("description", ""),
                "version": meta.get("version", ""),
                "keywords": meta.get("keywords", ""),
                "npm_url": f"https://www.npmjs.com/package/{name}",
                "score": match.score,
            }
        )

    return packages
