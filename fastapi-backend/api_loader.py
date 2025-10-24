"""
Dynamic API Loader
Loads user-generated API code from database and creates executable handlers
"""
import sys
import types
import importlib
from typing import Dict, Optional, Any
from datetime import datetime
from supabase import create_client, Client
from config import get_settings

settings = get_settings()
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)


class APIHandler:
    """Wrapper for dynamically loaded user API code"""

    def __init__(self, api_id: str, code: str, metadata: Dict):
        self.api_id = api_id
        self.code = code
        self.metadata = metadata
        self.module = None
        self.loaded_at = datetime.utcnow()

        # Load the code into a module
        self._load_code()

    def _load_code(self):
        """Dynamically load Python code into a module"""
        try:
            # Create a new module for this API
            module_name = f"user_api_{self.api_id.replace('-', '_')}"
            self.module = types.ModuleType(module_name)

            # Create a safe execution namespace
            namespace = {
                "__name__": module_name,
                "__file__": f"<api:{self.api_id}>",
                "print": print,  # Allow printing for debugging
            }

            # Execute the code in the module's namespace
            exec(self.code, namespace)
            self.module.__dict__.update(namespace)

            print(f"✅ Loaded API {self.api_id}: {self.metadata.get('name')}")

        except Exception as e:
            print(f"❌ Error loading API {self.api_id}: {str(e)}")
            raise

    def get_app(self):
        """Get the FastAPI app instance from the loaded module"""
        if hasattr(self.module, 'app'):
            return self.module.__dict__['app']
        return None

    async def execute(
        self,
        method: str,
        path: str,
        query_params: Dict,
        body: Any,
        headers: Dict
    ) -> Dict:
        """
        Execute the user's API code
        Returns info about the loaded API
        """
        try:
            app = self.get_app()
            if app:
                return {
                    "message": f"API {self.metadata.get('name')} is loaded",
                    "api_id": self.api_id,
                    "routes": [route.path for route in app.routes if hasattr(route, 'path')],
                    "note": "Use the API routes directly, e.g., /{api_id}/weather/london"
                }
            else:
                return {
                    "error": "FastAPI app not found in generated code",
                    "note": "The generated code must define an 'app' variable with a FastAPI instance"
                }

        except Exception as e:
            print(f"Error executing API {self.api_id}: {str(e)}")
            raise


class APILoader:
    """Manages loading and caching of user APIs"""

    def __init__(self):
        self.apis: Dict[str, APIHandler] = {}

    async def load_all_apis(self):
        """Load all active APIs from database"""
        try:
            response = supabase.table("apis").select("*").eq("status", "active").execute()

            loaded_count = 0
            for api_data in response.data:
                api_id = api_data["id"]
                code = api_data.get("code_snapshot")

                if code:
                    try:
                        handler = APIHandler(api_id, code, api_data)
                        self.apis[api_id] = handler
                        loaded_count += 1
                    except Exception as e:
                        print(f"Failed to load API {api_id}: {str(e)}")

            print(f"Loaded {loaded_count} APIs")

        except Exception as e:
            print(f"Error loading APIs: {str(e)}")

    async def load_api(self, api_id: str) -> bool:
        """Load a single API from database"""
        try:
            response = supabase.table("apis").select("*").eq("id", api_id).single().execute()

            if response.data:
                api_data = response.data
                code = api_data.get("code_snapshot")

                if code:
                    handler = APIHandler(api_id, code, api_data)
                    self.apis[api_id] = handler
                    return True

            return False

        except Exception as e:
            print(f"Error loading API {api_id}: {str(e)}")
            return False

    def get_api(self, api_id: str) -> Optional[APIHandler]:
        """Get a loaded API handler"""
        return self.apis.get(api_id)

    def unload_api(self, api_id: str):
        """Unload an API from memory"""
        if api_id in self.apis:
            del self.apis[api_id]
            print(f"Unloaded API {api_id}")

    def reload_api(self, api_id: str):
        """Reload an API (unload and load again)"""
        self.unload_api(api_id)
        return self.load_api(api_id)
