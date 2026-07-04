from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router as sim_router

app = FastAPI(
    title="Evolution of Artificial Personalities Simulation",
    description="A multi-agent simulation research backend leveraging genetic algorithms and custom behavioral traits.",
    version="1.0.0"
)

# Enable CORS for frontend local Vite port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API routes
app.include_router(sim_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "description": "Multi-Agent GA Personality Simulation API is fully operational.",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
