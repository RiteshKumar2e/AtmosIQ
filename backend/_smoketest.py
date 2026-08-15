"""End-to-end API smoke test. Run: python _smoketest.py"""
import io
import sys

from fastapi.testclient import TestClient

from app.main import app
from app.utils.demo_image import render_industrial_plume

failures = []


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    if not condition:
        failures.append(f"{name}: {detail}")
    print(f"  [{status}] {name}" + (f"  -- {detail}" if detail and not condition else ""))


with TestClient(app) as client:
    print("\n== System ==")
    r = client.get("/api/health")
    check("GET /api/health", r.status_code == 200, r.text[:200])
    print(f"         ai_provider={r.json()['ai_provider']} db={r.json()['database']}")

    r = client.get("/")
    check("GET /", r.status_code == 200)

    print("\n== Auth ==")
    r = client.post("/api/auth/demo-login", json={"role": "authority"})
    check("POST /api/auth/demo-login", r.status_code == 200, r.text[:300])
    token = r.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/auth/me", headers=auth)
    check("GET /api/auth/me", r.status_code == 200 and r.json()["role"] == "authority", r.text[:200])

    r = client.get("/api/auth/me")
    check("GET /api/auth/me (no token -> 401)", r.status_code == 401)

    r = client.post("/api/auth/register", json={
        "name": "Test User", "email": "smoke@test.dev", "password": "TestPass123", "role": "citizen"})
    check("POST /api/auth/register", r.status_code in (201, 409), r.text[:200])

    r = client.post("/api/auth/login", json={"email": "smoke@test.dev", "password": "wrongpass"})
    check("POST /api/auth/login (bad password -> 401)", r.status_code == 401)

    print("\n== Reports ==")
    r = client.get("/api/reports?page=1&page_size=5")
    check("GET /api/reports", r.status_code == 200 and r.json()["total"] > 20,
          f"total={r.json().get('total')}")
    first_id = r.json()["items"][0]["id"]

    r = client.get(f"/api/reports/{first_id}")
    check("GET /api/reports/{id}", r.status_code == 200 and r.json()["assessment"] is not None)

    r = client.get("/api/reports/999999")
    check("GET /api/reports/{missing} -> 404", r.status_code == 404)

    r = client.get("/api/reports/types")
    check("GET /api/reports/types", r.status_code == 200 and len(r.json()["types"]) == 6)

    print("\n== Report submission with image (full pipeline) ==")
    image = render_industrial_plume(320, 220)
    r = client.post(
        "/api/reports",
        headers=auth,
        data={
            "latitude": "28.6469", "longitude": "77.3152",
            "report_type": "industrial_emission",
            "description": "Dense dark smoke from the factory stack drifting over houses.",
            "location_label": "Smoke Test Site", "country_code": "IN", "region_code": "IN-DL",
            "pm25": "165", "pm10": "260", "temperature": "29", "humidity": "68",
        },
        files={"image": ("plume.png", io.BytesIO(image), "image/png")},
    )
    check("POST /api/reports (multipart+image)", r.status_code == 201, r.text[:400])
    if r.status_code == 201:
        body = r.json()
        a = body["assessment"]
        print(f"         risk={a['risk_score']} level={a['risk_level']} "
              f"event={a['event_type']} provider={body['ai_provider']}")
        print(f"         pipeline={body['pipeline']}")
        check("  assessment produced", a is not None)
        check("  contributions non-empty", len(a["contributions"]) >= 4)
        check("  evidence populated", "weather" in a["evidence"] and "vision" in a["evidence"])
        check("  image stored", body["report"]["image_url"] is not None)
        img_url = body["report"]["image_url"]
        rr = client.get(img_url)
        check("  uploaded image served", rr.status_code == 200 and rr.content[:4] == b"\x89PNG")

    print("\n== Upload + input validation ==")
    r = client.post("/api/reports", headers=auth, data={
        "latitude": "999", "longitude": "77", "report_type": "smoke"})
    check("rejects out-of-range latitude", r.status_code == 422, r.text[:200])

    r = client.post("/api/reports", headers=auth, data={
        "latitude": "28.6", "longitude": "77.2", "report_type": "not_a_type"})
    check("rejects unknown report_type", r.status_code == 422)

    r = client.post("/api/reports", headers=auth, data={
        "latitude": "28.6", "longitude": "77.2", "report_type": "smoke", "pm25": "9000"})
    check("rejects impossible PM2.5", r.status_code == 422)

    r = client.post("/api/reports", headers=auth, data={
        "latitude": "28.6", "longitude": "77.2", "report_type": "smoke",
        "pm25": "100", "pm10": "40"})
    check("rejects PM10 < PM2.5", r.status_code == 422)

    r = client.post("/api/reports", headers=auth,
                    data={"latitude": "28.6", "longitude": "77.2", "report_type": "smoke"},
                    files={"image": ("evil.txt", io.BytesIO(b"not an image at all"), "text/plain")})
    check("rejects non-image upload", r.status_code == 415, r.text[:200])

    r = client.post("/api/reports", headers=auth,
                    data={"latitude": "28.6", "longitude": "77.2", "report_type": "smoke"},
                    files={"image": ("fake.png", io.BytesIO(b"GIF89a" + b"x" * 400), "image/png")})
    check("rejects mislabelled content (magic-byte check)", r.status_code == 415)

    r = client.post("/api/reports", data={
        "latitude": "28.6", "longitude": "77.2", "report_type": "smoke"})
    check("rejects unauthenticated submission", r.status_code == 401)

    print("\n== Hotspots ==")
    r = client.get("/api/hotspots")
    check("GET /api/hotspots", r.status_code == 200 and len(r.json()) >= 10,
          f"count={len(r.json()) if r.status_code == 200 else r.text[:200]}")
    hid = r.json()[0]["id"]

    r = client.get(f"/api/hotspots/{hid}")
    check("GET /api/hotspots/{id}", r.status_code == 200 and r.json()["contributions"])

    r = client.get(f"/api/hotspots/{hid}/signals")
    check("GET /api/hotspots/{id}/signals", r.status_code == 200)

    r = client.get("/api/hotspots/map")
    check("GET /api/hotspots/map", r.status_code == 200, r.text[:300])
    if r.status_code == 200:
        m = r.json()
        print(f"         hotspots={len(m['hotspots'])} reports={len(m['reports'])} "
              f"stations={len(m['stations'])} corridors={len(m['corridors'])} "
              f"wind={m['wind']['speed_ms']}m/s {m['wind']['direction_compass']} "
              f"({m['wind']['data_mode']})")
        check("  map has stations", len(m["stations"]) >= 5)

    print("\n== Forecast ==")
    r = client.get("/api/forecast?horizon_hours=6")
    check("GET /api/forecast", r.status_code == 200, r.text[:300])
    if r.status_code == 200:
        f = r.json()
        print(f"         current={f['current_risk']} peak={f['peak_risk']}@{f['peak_at']} "
              f"trend={f['trend']} points={len(f['points'])} mode={f['data_mode']}")
        check("  7 points for 6h horizon", len(f["points"]) == 7)
        check("  bounds ordered", all(p["lower_bound"] <= p["risk_score"] <= p["upper_bound"]
                                      for p in f["points"]))
        check("  uncertainty widens with horizon",
              (f["points"][-1]["upper_bound"] - f["points"][-1]["lower_bound"]) >
              (f["points"][0]["upper_bound"] - f["points"][0]["lower_bound"]))
        check("  contributing factors present", len(f["contributing_factors"]) >= 3)

    print("\n== Alerts ==")
    r = client.get("/api/alerts")
    check("GET /api/alerts", r.status_code == 200 and len(r.json()) >= 5,
          f"count={len(r.json()) if r.status_code == 200 else r.text[:200]}")
    alerts = r.json()
    new_alert = next((a for a in alerts if a["status"] == "NEW"), None)

    r = client.get("/api/alerts/summary")
    check("GET /api/alerts/summary", r.status_code == 200)

    if new_alert:
        aid = new_alert["id"]
        r = client.patch(f"/api/alerts/{aid}", headers=auth, json={"status": "ACKNOWLEDGED"})
        check("PATCH alert -> ACKNOWLEDGED",
              r.status_code == 200 and r.json()["acknowledged_at"], r.text[:200])

        r = client.patch(f"/api/alerts/{aid}", headers=auth, json={"assigned_to": "Mobile Unit 7"})
        check("PATCH alert -> assign", r.status_code == 200 and r.json()["status"] == "ASSIGNED")

        r = client.patch(f"/api/alerts/{aid}", headers=auth, json={"status": "RESOLVED"})
        check("PATCH alert -> RESOLVED", r.status_code == 200 and r.json()["resolved_at"])

        r = client.patch(f"/api/alerts/{aid}", headers=auth, json={"status": "NEW"})
        check("rejects invalid transition from RESOLVED", r.status_code == 409, r.text[:200])

        r = client.patch(f"/api/alerts/{aid}", json={"status": "ACKNOWLEDGED"})
        check("rejects unauthenticated alert update", r.status_code == 401)

        rc = client.post("/api/auth/demo-login", json={"role": "citizen"})
        ctoken = {"Authorization": f"Bearer {rc.json()['access_token']}"}
        r = client.patch(f"/api/alerts/{aid}", headers=ctoken, json={"status": "ACKNOWLEDGED"})
        check("citizen role forbidden from alert update", r.status_code == 403, r.text[:200])

    print("\n== Analytics ==")
    r = client.get("/api/analytics/overview")
    check("GET /api/analytics/overview", r.status_code == 200, r.text[:400])
    if r.status_code == 200:
        o = r.json()
        print(f"         risk={o['current_risk']} ({o['current_risk_level']}) "
              f"hotspots={o['active_hotspots']} signals24h={o['citizen_signals_24h']} "
              f"aqi={o['air_quality']['aqi']} mode={o['air_quality']['data_mode']}")
        check("  4 KPIs", len(o["kpis"]) == 4)
        check("  explainability present", len(o["explainability"]) >= 4)
        check("  reasoning summary present", len(o["reasoning_summary"]) > 40)

    for g in ("daily", "weekly", "monthly"):
        r = client.get(f"/api/analytics/trends?granularity={g}")
        ok = r.status_code == 200 and len(r.json()["trends"]) > 0
        check(f"GET /api/analytics/trends ({g})", ok, r.text[:200])
        if ok and g == "daily":
            t = r.json()
            print(f"         trends={len(t['trends'])} sources={len(t['sources'])} "
                  f"regions={len(t['distribution'])} coverage={len(t['coverage'])}")
            check("  source attribution present", len(t["sources"]) >= 3)
            check("  coverage series present", len(t["coverage"]) >= 1)

    r = client.get("/api/analytics/responsible-ai")
    check("GET /api/analytics/responsible-ai",
          r.status_code == 200 and len(r.json()["limitations"]) >= 5)

    print("\n== BRICS ==")
    r = client.get("/api/brics/overview")
    check("GET /api/brics/overview", r.status_code == 200, r.text[:300])
    if r.status_code == 200:
        b = r.json()
        print(f"         nodes={len(b['nodes'])} countries={b['aggregate']['member_states']} "
              f"pop={b['aggregate']['population_covered_millions']}M")
        check("  5 BRICS nodes", len(b["nodes"]) == 5)
        check("  shared schema present", "risk_model" in b["shared_schema"])
        check("  principles present", len(b["federation_principles"]) >= 5)
        check("  layers present", len(b["interoperability_layers"]) == 5)

    r = client.get("/api/brics/nodes/IN")
    check("GET /api/brics/nodes/IN", r.status_code == 200)
    r = client.get("/api/brics/nodes/XX")
    check("GET /api/brics/nodes/XX -> 404", r.status_code == 404)

    print("\n== Demo scenario ==")
    r = client.get("/api/demo/scenario")
    check("GET /api/demo/scenario", r.status_code == 200 and len(r.json()["steps"]) == 7)

    r = client.post("/api/demo/scenario/run", headers=auth)
    check("POST /api/demo/scenario/run", r.status_code == 200, r.text[:500])
    if r.status_code == 200:
        d = r.json()
        print(f"         risk={d['hotspot']['risk_score']} ({d['hotspot']['risk_level']}) "
              f"alert={d['alert']['severity']} steps={len(d['steps'])} "
              f"provider={d['ai_provider']} {d['total_ms']}ms")
        print(f"         action: {d['alert']['recommended_action'][:90]}")
        check("  produced a hotspot", d["hotspot"]["id"] > 0)
        check("  produced an alert", d["alert"]["id"] > 0)
        check("  forecast attached", len(d["forecast"]["points"]) == 7)
        check("  steps ordered with forecast before alert",
              [s["key"] for s in d["steps"]].index("forecast") <
              [s["key"] for s in d["steps"]].index("alert"))
        check("  scenario image rendered", d["report"]["image_url"] is not None)

    r = client.post("/api/demo/reset", headers=auth)
    check("POST /api/demo/reset", r.status_code == 200, r.text[:300])
    if r.status_code == 200:
        print(f"         removed: {r.json()['reports_removed']} reports, "
              f"{r.json()['hotspots_removed']} hotspots, {r.json()['alerts_removed']} alerts")

    print("\n== OpenAPI ==")
    r = client.get("/openapi.json")
    check("GET /openapi.json", r.status_code == 200 and len(r.json()["paths"]) >= 20,
          f"paths={len(r.json().get('paths', {}))}")

print("\n" + "=" * 62)
if failures:
    print(f"{len(failures)} FAILURE(S):")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("ALL CHECKS PASSED")
