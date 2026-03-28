from pydantic import BaseModel, Field
from typing import Optional


class SearchRequest(BaseModel):
    query: str = Field(
        ..., min_length=1, max_length=1000, description="What the user needs"
    )
    framework: Optional[str] = Field(None, description="e.g. 'react', 'vue', 'node'")
    priorities: Optional[list[str]] = Field(
        None, description="e.g. ['bundle size', 'TypeScript support']"
    )


class Package(BaseModel):
    name: str
    description: str
    version: str
    npm_url: str


class SearchResponse(BaseModel):
    packages: list[Package]
