"""Deployment regions.

Every intelligence endpoint accepts a `region_code`; this is how a client
discovers which codes exist so a user can switch between them.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.models import Region
from app.schemas.schemas import RegionListOut, RegionOut

router = APIRouter(prefix="/api/regions", tags=["Regions"])


@router.get("", response_model=RegionListOut)
def list_regions(db: Session = Depends(get_db)) -> RegionListOut:
    """All configured deployment regions, active node first."""
    rows: List[Region] = list(
        db.scalars(select(Region).order_by(Region.country_name, Region.name)).all()
    )

    # The node this deployment is configured as leads the list, so the region
    # a user most likely wants is the first thing they see.
    default_code = settings.default_region_code.upper()
    rows.sort(key=lambda region: (region.region_code.upper() != default_code,))

    return RegionListOut(
        regions=[RegionOut.model_validate(region) for region in rows],
        default_region_code=default_code,
    )
