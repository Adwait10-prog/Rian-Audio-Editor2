#!/usr/bin/env python3
import requests
import json
import sys
import os

def fetch_voices():
    """Fetch voices from ElevenLabs API"""
    api_key = os.environ.get('ELEVENLABS_API_KEY', 'sk_a6d6b1da1f11871027eafac43784fb5728ac04414e1bb800')
    
    try:
        response = requests.get(
            "https://api.elevenlabs.io/v2/voices",
            headers={
                "xi-api-key": api_key
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            # Output the JSON to stdout so Node.js can capture it
            print(json.dumps(data))
            return True
        else:
            error_data = {
                "error": f"ElevenLabs API returned status {response.status_code}",
                "message": response.text
            }
            print(json.dumps(error_data), file=sys.stderr)
            return False
            
    except requests.exceptions.RequestException as e:
        error_data = {
            "error": "Request failed",
            "message": str(e)
        }
        print(json.dumps(error_data), file=sys.stderr)
        return False
    except Exception as e:
        error_data = {
            "error": "Unexpected error",
            "message": str(e)
        }
        print(json.dumps(error_data), file=sys.stderr)
        return False

if __name__ == "__main__":
    success = fetch_voices()
    sys.exit(0 if success else 1)