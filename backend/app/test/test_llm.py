import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.llm import build_prompt, stream_response


def mock_openai_stream(chunks):
    """Helper to mock OpenAI async stream"""
    mock_stream = AsyncMock()
    mock_stream.__aiter__.return_value = chunks

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_stream)

    return mock_client


class TestBuildPrompt:
    """Tests for the build_prompt function."""

    def test_build_prompt_basic(self):
        packages = [
            {
                "name": "lodash",
                "version": "4.17.21",
                "description": "A modern JavaScript utility library",
                "keywords": ["modules", "stdlib", "util"],
                "npm_url": "https://www.npmjs.com/package/lodash",
            }
        ]

        result = build_prompt("I need a utility library", packages, None, None)

        assert "lodash" in result
        assert "Do NOT suggest packages outside this list" in result

    def test_build_prompt_with_framework_and_priorities(self):
        packages = [
            {
                "name": "react-query",
                "version": "5.0.0",
                "description": "Hooks",
                "keywords": ["react"],
                "npm_url": "https://www.npmjs.com/package/react-query",
            }
        ]

        result = build_prompt(
            "data fetching",
            packages,
            framework="Next.js",
            priorities=["performance", "small bundle"],
        )

        assert "Framework: Next.js" in result
        assert "performance, small bundle" in result

    def test_build_prompt_multiple_packages(self):
        packages = [
            {
                "name": "axios",
                "version": "1",
                "description": "http",
                "keywords": [],
                "npm_url": "x",
            },
            {
                "name": "ky",
                "version": "1",
                "description": "fetch",
                "keywords": [],
                "npm_url": "y",
            },
        ]

        result = build_prompt("HTTP", packages, None, None)

        assert "**axios**" in result
        assert "**ky**" in result


class TestStreamResponse:
    @pytest.mark.asyncio
    async def test_stream_response_yields_content(self):
        chunks = [
            MagicMock(choices=[MagicMock(delta=MagicMock(content="Hello"))]),
            MagicMock(choices=[MagicMock(delta=MagicMock(content=" World"))]),
            MagicMock(choices=[MagicMock(delta=MagicMock(content=None))]),
        ]

        with patch("app.llm.get_openai_client") as mock_get:
            mock_get.return_value = mock_openai_stream(chunks)

            result = []
            async for c in stream_response("q", []):
                result.append(c)

        assert result == ["Hello", " World"]

    @pytest.mark.asyncio
    async def test_stream_response_escapes_newlines(self):
        chunks = [
            MagicMock(choices=[MagicMock(delta=MagicMock(content="Line1\nLine2"))]),
        ]

        with patch("app.llm.get_openai_client") as mock_get:
            mock_get.return_value = mock_openai_stream(chunks)

            result = []
            async for c in stream_response("q", []):
                result.append(c)

        assert result == ["Line1\\nLine2"]

    @pytest.mark.asyncio
    async def test_stream_response_passes_correct_params(self):
        chunks = []

        with patch("app.llm.get_openai_client") as mock_get:
            client = mock_openai_stream(chunks)
            mock_get.return_value = client

            async for _ in stream_response(
                "my query",
                [
                    {
                        "name": "p",
                        "version": "1",
                        "description": "d",
                        "keywords": [],
                        "npm_url": "u",
                    }
                ],
                framework="React",
                priorities=["fast", "small"],
            ):
                break

        call = client.chat.completions.create.call_args.kwargs

        assert call["model"] == "gpt-4o"
        assert call["stream"] is True
        assert call["temperature"] == 0.3
        assert "React" in call["messages"][0]["content"]

    @pytest.mark.asyncio
    async def test_stream_response_handles_empty_delta(self):
        chunks = [
            MagicMock(choices=[MagicMock(delta=MagicMock(content=None))]),
            MagicMock(choices=[MagicMock(delta=MagicMock(content=""))]),
            MagicMock(choices=[MagicMock(delta=MagicMock(content="real"))]),
        ]

        with patch("app.llm.get_openai_client") as mock_get:
            mock_get.return_value = mock_openai_stream(chunks)

            result = []
            async for c in stream_response("q", []):
                result.append(c)

        assert result == ["", "real"]

    @pytest.mark.asyncio
    async def test_stream_response_build_prompt_called(self):
        with patch("app.llm.build_prompt") as mock_build:
            mock_build.return_value = "prompt"

            with patch("app.llm.get_openai_client") as mock_get:
                mock_get.return_value = mock_openai_stream([])

                async for _ in stream_response(
                    "test",
                    [
                        {
                            "name": "x",
                            "version": "1",
                            "description": "d",
                            "keywords": [],
                            "npm_url": "u",
                        }
                    ],
                    framework="Vue",
                    priorities=["test"],
                ):
                    pass

        mock_build.assert_called_once()
