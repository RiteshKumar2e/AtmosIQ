"""Deployment regions.

Every intelligence endpoint accepts a `region_code`; this is how a client
discovers which codes exist so a user can switch between them.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.models import Region
from app.schemas.schemas import RegionListOut, RegionOut
from app.utils.cache import cached

router = APIRouter(prefix="/api/regions", tags=["Regions"])


@router.get("", response_model=RegionListOut)
@cached(ttl=600, prefix="regions.list")
def list_regions(
    db: Session = Depends(get_db),
    country_code: Optional[str] = Query(
        default=None,
        max_length=3,
        description=(
            "ISO 3166-1 alpha-2 country to list regions for. Defaults to this "
            "deployment's own country. Pass `ALL` for every configured region."
        ),
    ),
) -> RegionListOut:
    """Selectable deployment regions, this node's own region first.

    Scoped to the deploying country by default: an operator picks between the
    states they are responsible for, not other nations' regions. Partner-country
    records still exist and remain available to the BRICS network endpoints.
    """
    query = select(Region)

    requested = (country_code or settings.default_country_code).upper()
    if requested != "ALL":
        query = query.where(Region.country_code == requested)

    rows: List[Region] = list(db.scalars(query.order_by(Region.name)).all())

    # The node this deployment is configured as leads the list, so the region a
    # user most likely wants is the first thing they see.
    default_code = settings.default_region_code.upper()
    rows.sort(key=lambda region: (region.region_code.upper() != default_code,))

    return RegionListOut(
        regions=[RegionOut.model_validate(region) for region in rows],
        default_region_code=default_code,
    )
