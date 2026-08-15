from datetime import datetime

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="What the user needs")
    framework: str | None = Field(None, description="e.g. 'react', 'vue', 'node'")
    priorities: list[str] | None = Field(
        None, description="e.g. ['bundle size', 'TypeScript support']"
    )


class Package(BaseModel):
    name: str
    description: str
    version: str
    npm_url: str


class SearchResponse(BaseModel):
    packages: list[Package]


class PageView(BaseModel):
    visited_at: datetime
    ip_hash: str
    user_agent: str | None = None
    referrer: str | None = None


class SearchEvent(BaseModel):
    searched_at: datetime
    query: str
    framework: str | None = None
    priorities: list[str] | None = None
    result_count: int


class TopItem(BaseModel):
    label: str
    count: int


class AnalyticsSummary(BaseModel):
    total_visits: int
    unique_visitors: int
    total_searches: int
    visits_last_24h: int
    searches_last_24h: int
    top_queries: list[TopItem]
    top_frameworks: list[TopItem]
    top_referrers: list[TopItem]
