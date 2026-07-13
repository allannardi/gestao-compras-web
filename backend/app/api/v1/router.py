from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")


@router.get("/status", tags=["Sistema"])
def status() -> dict[str, str]:
    return {
        "api": "ready",
        "next_step": "nfce-preview",
    }
