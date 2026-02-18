
import os
import sys

# Add website/ to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from server.services import datacommons as dc
from flask import Flask

def verify_get_place_info():
    print(f"DEBUG: datacommons file: {getattr(dc, '__file__', 'unknown')}", flush=True)
    print("Verifying get_place_info...", flush=True)
    # Test with a known place (California)
    dcids = ["geoId/06"]
    try:
        result = dc.get_place_info(dcids)
        print(f"Result for geoId/06: {result}", flush=True)
        # Result should be {'data': [{'node': 'geoId/06', 'info': {...}}]}
        assert "data" in result, f"'data' not in result: {result}"
        data_list = result["data"]
        assert len(data_list) > 0, "data list is empty"
        
        # Find item for geoId/06
        item = next((x for x in data_list if x.get("node") == "geoId/06"), None)
        assert item is not None, f"geoId/06 not found in data: {data_list}"
        
        info = item.get("info", {})
        assert "self" in info, f"self not in info: {info}"
        assert "name" in info["self"], f"name not in self info: {info}"
        assert "type" in info["self"], f"type not in self info: {info}"
        assert "parents" in info, f"parents not in info: {info}"
        
        # Check parents content
        parents = info["parents"]
        assert len(parents) > 0, "No parents found"
        # Verify USA is in parents
        usa = next((p for p in parents if p["dcid"] == "country/USA"), None)
        assert usa is not None, "USA not found in parents"
        
        print("get_place_info: PASS", flush=True)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"get_place_info: FAIL - {repr(e)}", flush=True)
        import traceback
        traceback.print_exc()

def verify_get_series_dates():
    print("\nVerifying get_series_dates...")
    # Test with known entities/variables
    parent_entity = "geoId/06" # California
    child_type = "County"
    variables = ["Count_Person", "Median_Age_Person"] # Common variables
    try:
        result = dc.get_series_dates(parent_entity, child_type, variables)
        print("Result for California counties:", result)
        # Basic assertions
        assert "datesByVariable" in result
        for var in variables:
            # We assume at least some data exists for these common vars
            if var in result["datesByVariable"]:
                print(f"  Confirming data for {var}: PASS")
                assert len(result["datesByVariable"][var]) > 0
            else:
                print(f"  Warning: No data for {var}")
        print("get_series_dates: PASS")
    except Exception as e:
        print(f"get_series_dates: FAIL - {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Setup Flask app context to load config
    app = Flask(__name__)
    # Set environment variables if needed
    os.environ['FLASK_ENV'] = 'local' 
    
    # We need to manually load config since we aren't running the full app
    # But datacommons.py uses `current_app.config['API_ROOT']` if available, 
    # or defaults to `https://api.datacommons.org`.
    # Let's ensure FLASK_ENV is set so if it tries to load config it works.
    
    # Actually, datacommons.py imports `cfg` from a module level variable?
    # No, it uses `current_app.config`.
    
    with app.app_context():
        # Manually set API_ROOT if needed, but default should work for public data
        app.config['API_ROOT'] = 'https://api.datacommons.org'
        app.config['SECRET_PROJECT'] = '' # avoid GCP errors if any
        app.config['DC_API_KEY'] = os.environ.get('DC_API_KEY', '')
        
        # Initialize cache to avoid AttributeError
        from server.lib import cache as lib_cache
        if lib_cache.cache:
            lib_cache.cache.init_app(app)
        if lib_cache.model_cache:
            pass # model_cache might be same as cache or different, but usually we only need main cache for datacommons.py
        
        verify_get_place_info()
        verify_get_series_dates()
