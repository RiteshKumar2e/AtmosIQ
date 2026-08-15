import json
from sqlalchemy import select
from app.database.session import SessionLocal
from app.models.models import AIAssessment

db = SessionLocal()
rows = db.scalars(select(AIAssessment)).all()
scores = sorted(r.risk_score for r in rows)
probs = sorted(r.hotspot_probability for r in rows)
print("n =", len(rows))
print("risk  min/med/max:", scores[0], scores[len(scores) // 2], scores[-1])
print("prob  min/med/max:", probs[0], probs[len(probs) // 2], probs[-1])
print("conf  min/max:", min(r.confidence for r in rows), max(r.confidence for r in rows))
print("levels:", {l: sum(1 for r in rows if r.risk_level == l)
                  for l in ("LOW", "MODERATE", "HIGH", "CRITICAL")})
sample = max(rows, key=lambda r: r.risk_score)
print("top contributions:", [(c["factor"], c["weight_pct"]) for c in json.loads(sample.contributions)])
