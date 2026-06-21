import os
from fastapi.testclient import TestClient
from app.fast_api_app import app

client = TestClient(app)

def test_root_route():
    os.environ["ENV"] = "production"
    os.environ["AGENT_VERSION"] = "1.0.0"
    
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert data["project"] == "AI-Powered Railway Revenue Protection Platform"
    assert data["status"] == "online"
    assert data["version"] == "1.0.0"
    assert data["environment"] == "production"
    assert "available_endpoints" in data
    assert "agents" in data
    assert "agent_architecture_summary" in data
    assert "GET /" in data["available_endpoints"]
    assert "GET /health" in data["available_endpoints"]

def test_health_route():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
