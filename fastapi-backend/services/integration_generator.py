"""
Integration code generation service using Anthropic Claude API.
Generates production-ready integration code for user APIs.
"""

import os
from typing import Dict, List, Optional
import anthropic
from fastapi import HTTPException


class IntegrationGenerator:
    """Generates integration code for APIs using Claude."""

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"

    def generate_integration_code(
        self,
        api_endpoint: str,
        api_key: str,
        api_description: str,
        user_description: str,
        target_language: str,
        integration_type: str = "custom"
    ) -> Dict[str, any]:
        """
        Generate integration code for an API.

        Args:
            api_endpoint: The full API endpoint URL
            api_key: The API key for authentication
            api_description: Description of what the API does
            user_description: What the user wants to accomplish
            target_language: Target programming language
            integration_type: Type of integration (custom, salesforce, slack, etc.)

        Returns:
            Dict containing code, dependencies, and setup instructions
        """

        system_prompt = self._get_system_prompt(integration_type)
        user_prompt = self._build_user_prompt(
            api_endpoint=api_endpoint,
            api_key=api_key,
            api_description=api_description,
            user_description=user_description,
            target_language=target_language
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )

            content = response.content[0].text
            return self._parse_response(content, target_language)

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate integration code: {str(e)}"
            )

    def _get_system_prompt(self, integration_type: str) -> str:
        """Get the appropriate system prompt based on integration type."""

        base_prompt = """You are an expert integration engineer specializing in creating production-ready code.
Your task is to generate complete, working integration code that connects user APIs to various platforms.

CRITICAL REQUIREMENTS:
1. Generate COMPLETE, RUNNABLE code - not snippets or pseudocode
2. Include ALL necessary imports and dependencies
3. Add comprehensive error handling (try/catch, status code checks, timeouts)
4. Include authentication setup and secure credential handling
5. Add detailed comments explaining each section
6. Provide clear setup instructions
7. Include usage examples
8. Follow best practices for the target language
9. Make code production-ready (logging, retry logic, rate limiting awareness)

OUTPUT FORMAT:
You must structure your response EXACTLY as follows:

```[LANGUAGE]
[COMPLETE CODE HERE]
```

DEPENDENCIES:
[List of required packages/libraries, one per line]

SETUP:
[Step-by-step setup instructions]

USAGE:
[How to run and use the code]

Do not include any text outside this structure."""

        integration_prompts = {
            "salesforce": "\n\nSPECIAL FOCUS: Generate code that integrates with Salesforce API. Include OAuth2 authentication, object creation/updates, and SOQL queries. Use simple-salesforce library for Python or jsforce for JavaScript.",

            "slack": "\n\nSPECIAL FOCUS: Generate code that sends formatted messages to Slack. Use webhook URLs or the Slack SDK. Include error handling for rate limits and message formatting.",

            "github_actions": "\n\nSPECIAL FOCUS: Generate a GitHub Actions workflow YAML file that calls the API. Include secrets management, error handling, and scheduling options.",

            "google_sheets": "\n\nSPECIAL FOCUS: Generate code that writes data to Google Sheets. Include Google Sheets API authentication, sheet creation, and data appending.",

            "webhook": "\n\nSPECIAL FOCUS: Generate code that receives webhook data and calls the API. Include signature verification if applicable and proper HTTP response handling.",

            "discord": "\n\nSPECIAL FOCUS: Generate code that sends messages to Discord via webhooks. Include embed formatting and error handling."
        }

        return base_prompt + integration_prompts.get(integration_type, "")

    def _build_user_prompt(
        self,
        api_endpoint: str,
        api_key: str,
        api_description: str,
        user_description: str,
        target_language: str
    ) -> str:
        """Build the user prompt with API details."""

        return f"""Generate integration code with these specifications:

API DETAILS:
- Endpoint: {api_endpoint}
- Authentication: Bearer token in Authorization header
- API Key: {api_key}
- API Description: {api_description}

USER REQUIREMENT:
{user_description}

TARGET LANGUAGE: {target_language}

IMPORTANT:
- Use the exact API endpoint provided above
- Include the API key in the Authorization header as: "Bearer {api_key}"
- Generate complete, production-ready code
- Include error handling for common issues (network errors, auth failures, rate limits)
- Add retry logic for transient failures
- Include logging for debugging
- Follow {target_language} best practices and conventions
- Make the code easy to understand and modify

Generate the complete integration code now."""

    def _parse_response(self, content: str, language: str) -> Dict[str, any]:
        """Parse Claude's response into structured components."""

        result = {
            "code": "",
            "dependencies": [],
            "setup_instructions": "",
            "usage_example": ""
        }

        code_start = content.find("```")
        if code_start != -1:
            code_end = content.find("```", code_start + 3)
            if code_end != -1:
                code_block = content[code_start + 3:code_end]
                if code_block.startswith(language.lower()) or code_block.startswith(language.upper()):
                    code_block = code_block[len(language):].strip()
                elif '\n' in code_block and code_block.split('\n')[0].strip().lower() in ['python', 'javascript', 'typescript', 'ruby', 'go', 'php', 'curl', 'yaml']:
                    code_block = '\n'.join(code_block.split('\n')[1:])
                result["code"] = code_block.strip()

        deps_start = content.find("DEPENDENCIES:")
        if deps_start != -1:
            deps_end = content.find("\n\n", deps_start)
            if deps_end != -1:
                deps_text = content[deps_start + 13:deps_end].strip()
                result["dependencies"] = [
                    dep.strip() for dep in deps_text.split("\n")
                    if dep.strip() and not dep.strip().startswith("DEPENDENCIES:")
                ]

        setup_start = content.find("SETUP:")
        if setup_start != -1:
            setup_end = content.find("USAGE:", setup_start)
            if setup_end == -1:
                setup_end = len(content)
            result["setup_instructions"] = content[setup_start + 6:setup_end].strip()

        usage_start = content.find("USAGE:")
        if usage_start != -1:
            result["usage_example"] = content[usage_start + 6:].strip()

        return result

    def generate_sdk(
        self,
        api_endpoint: str,
        api_key: str,
        api_description: str,
        api_methods: List[Dict],
        languages: List[str]
    ) -> Dict[str, Dict[str, any]]:
        """
        Generate SDK code in multiple languages.

        Args:
            api_endpoint: The API base endpoint
            api_key: The API key
            api_description: What the API does
            api_methods: List of API methods/endpoints
            languages: List of target languages

        Returns:
            Dict mapping language to SDK code and docs
        """

        results = {}

        for language in languages:
            try:
                sdk_code = self._generate_single_sdk(
                    api_endpoint=api_endpoint,
                    api_key=api_key,
                    api_description=api_description,
                    api_methods=api_methods,
                    language=language
                )
                results[language] = sdk_code
            except Exception as e:
                results[language] = {
                    "error": str(e),
                    "code": "",
                    "dependencies": [],
                    "setup_instructions": f"Failed to generate SDK: {str(e)}"
                }

        return results

    def _generate_single_sdk(
        self,
        api_endpoint: str,
        api_key: str,
        api_description: str,
        api_methods: List[Dict],
        language: str
    ) -> Dict[str, any]:
        """Generate SDK for a single language."""

        system_prompt = """You are an expert SDK developer. Generate a complete, production-ready SDK/client library.

The SDK must include:
1. A client class with initialization (API key, base URL)
2. Methods for each API endpoint
3. Error handling with custom exceptions
4. Type hints/annotations where applicable
5. Request retry logic
6. Rate limiting awareness
7. Comprehensive docstrings/comments
8. Usage examples in README format

OUTPUT FORMAT:
```[LANGUAGE]
[SDK CODE]
```

DEPENDENCIES:
[Required packages]

README:
[Installation and usage guide]"""

        methods_desc = "\n".join([
            f"- {m.get('method', 'GET')} {m.get('path', '/')}: {m.get('description', 'No description')}"
            for m in api_methods
        ])

        user_prompt = f"""Generate a complete SDK/client library with these specifications:

API DETAILS:
- Base Endpoint: {api_endpoint}
- Authentication: Bearer token
- API Key: {api_key}
- Description: {api_description}

API METHODS:
{methods_desc}

TARGET LANGUAGE: {language}

Generate a complete, installable SDK package with:
- Clear class structure
- All API methods implemented
- Error handling
- Type safety
- Documentation
- Usage examples"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        return self._parse_response(response.content[0].text, language)


integration_generator = IntegrationGenerator()
