"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Crosshair,
  ImageUp,
  MapPin,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataBadge } from "@/components/dashboard/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Field,
  InlineAlert,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { ApiError, reportsApi } from "@/lib/api";
import { DEFAULT_MAP_CENTER, REPORT_TYPES } from "@/lib/constants";
import { riskColor, titleCase } from "@/lib/utils";
import type { AnalyzeResponse } from "@/types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Optional numeric field: an empty string means "not measured", not zero. */
const optionalNumber = (max: number, label: string) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "" || value === null) return undefined;
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    })
    .refine((value) => value === undefined || (value >= 0 && value <= max), {
      message: `${label} must be between 0 and ${max}`,
    });

const reportSchema = z.object({
  location_label: z
    .string()
    .trim()
    .min(3, "Describe where this is happening")
    .max(160, "Location must be 160 characters or fewer"),
  latitude: z.coerce
    .number({ invalid_type_error: "Latitude is required" })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z.coerce
    .number({ invalid_type_error: "Longitude is required" })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  report_type: z.enum(["smoke", "dust", "burning", "industrial_emission", "smog", "other"]),
  description: z
    .string()
    .trim()
    .min(15, "Please describe what you can see, at least 15 characters")
    .max(2000, "Description must be 2000 characters or fewer"),
  pm25: optionalNumber(1500, "PM2.5"),
  pm10: optionalNumber(2000, "PM10"),
  temperature: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "" || value === null) return undefined;
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    })
    .refine((value) => value === undefined || (value >= -60 && value <= 65), {
      message: "Temperature must be between -60 and 65 °C",
    }),
  humidity: optionalNumber(100, "Humidity"),
});

type ReportValues = z.input<typeof reportSchema>;

export function ReportPollutionDialog() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [locating, setLocating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema) as never,
    defaultValues: {
      location_label: "",
      latitude: DEFAULT_MAP_CENTER[1] as unknown as number,
      longitude: DEFAULT_MAP_CENTER[0] as unknown as number,
      report_type: "smoke",
      description: "",
      pm25: "",
      pm10: "",
      temperature: "",
      humidity: "",
    },
  });

  const onSelectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImageError(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file (JPEG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be 8 MB or smaller.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setServerError("This browser does not expose a location service.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("latitude", Number(position.coords.latitude.toFixed(6)) as never, {
          shouldValidate: true,
        });
        setValue("longitude", Number(position.coords.longitude.toFixed(6)) as never, {
          shouldValidate: true,
        });
        setLocating(false);
        toast.success("Location captured", "Coordinates set from your device.");
      },
      () => {
        setLocating(false);
        setServerError(
          "Could not read your location. Enter the coordinates manually instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onSubmit = handleSubmit(async (raw) => {
    setServerError(null);
    const values = reportSchema.parse(raw);

    const form = new FormData();
    form.append("latitude", String(values.latitude));
    form.append("longitude", String(values.longitude));
    form.append("report_type", values.report_type);
    form.append("description", values.description);
    form.append("location_label", values.location_label);
    form.append("analyze", "true");

    if (values.pm25 !== undefined) form.append("pm25", String(values.pm25));
    if (values.pm10 !== undefined) form.append("pm10", String(values.pm10));
    if (values.temperature !== undefined) form.append("temperature", String(values.temperature));
    if (values.humidity !== undefined) form.append("humidity", String(values.humidity));
    if (imageFile) form.append("image", imageFile);

    try {
      const response = await reportsApi.create(form);
      setResult(response);
      toast.success(
        "Report analysed",
        response.hotspot
          ? `A hotspot was raised at ${response.hotspot.location_label}.`
          : "Your observation has been recorded and scored.",
      );
      await queryClient.invalidateQueries();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Your report could not be submitted. Please try again.";
      setServerError(message);
      toast.error("Submission failed", message);
    }
  });

  const startAnother = () => {
    setResult(null);
    setServerError(null);
    clearImage();
    reset();
  };

  const closeDialog = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setResult(null);
      setServerError(null);
      clearImage();
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <MapPin size={16} aria-hidden="true" />
          Report Pollution
        </Button>
      </DialogTrigger>

      <DialogContent
        title={result ? "Analysis complete" : "Report a pollution event"}
        description={
          result
            ? "Your observation was processed through the full detection pipeline."
            : "Submit what you can see. An image improves the confidence of the assessment."
        }
        footer={
          result ? (
            <>
              <Button variant="secondary" onClick={startAnother}>
                Report another
              </Button>
              <Button onClick={() => closeDialog(false)}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => closeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={onSubmit} loading={isSubmitting}>
                <Sparkles size={16} aria-hidden="true" />
                Analyse Report
              </Button>
            </>
          )
        }
      >
        {result ? (
          <ReportResult result={result} />
        ) : (
          <form onSubmit={onSubmit} noValidate>
            {serverError ? <InlineAlert variant="error">{serverError}</InlineAlert> : null}

            {/* Where ------------------------------------------------------- */}
            <section className="report-form-section">
              <p className="report-form-section-title">
                <MapPin size={13} aria-hidden="true" />
                Location
              </p>

              <Field
                label="Location"
                htmlFor="report-location"
                required
                hint="A recognisable place name, e.g. “Bawana Industrial Area, Sector 5”."
                error={errors.location_label?.message}
              >
                <Input
                  {...register("location_label")}
                  placeholder="Bawana Industrial Area, Sector 5"
                />
              </Field>

              <div className="coord-row">
                <Field
                  label="Latitude"
                  htmlFor="report-latitude"
                  required
                  error={errors.latitude?.message}
                >
                  <Input {...register("latitude")} type="number" step="any" />
                </Field>
                <Field
                  label="Longitude"
                  htmlFor="report-longitude"
                  required
                  error={errors.longitude?.message}
                >
                  <Input {...register("longitude")} type="number" step="any" />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={useMyLocation}
                  loading={locating}
                  style={{ marginBottom: 18 }}
                >
                  <Crosshair size={15} aria-hidden="true" />
                  Use my location
                </Button>
              </div>
            </section>

            {/* What -------------------------------------------------------- */}
            <section className="report-form-section">
              <p className="report-form-section-title">Observation</p>

              <Field
                label="Pollution Type"
                htmlFor="report-type"
                required
                error={errors.report_type?.message}
              >
                <Select {...register("report_type")}>
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} — {type.description}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Description"
                htmlFor="report-description"
                required
                hint="What can you see and smell? How long has it been going on?"
                error={errors.description?.message}
              >
                <Textarea
                  {...register("description")}
                  rows={5}
                  placeholder="Thick dark smoke has been discharging from a factory stack since early morning. The smell is very strong and visibility on the service road is heavily reduced."
                />
              </Field>

              <div className="field">
                <span className="field-label">Image</span>

                {imagePreview ? (
                  <div className="file-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview of the pollution event you captured" />
                    <button
                      type="button"
                      className="file-preview-remove"
                      onClick={clearImage}
                      aria-label="Remove image"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <label className="file-drop" htmlFor="report-image">
                    <ImageUp size={22} aria-hidden="true" />
                    <span style={{ fontWeight: 600 }}>Add a photograph</span>
                    <span style={{ fontSize: "var(--text-xs)" }}>
                      JPEG, PNG or WebP · up to 8 MB
                    </span>
                  </label>
                )}

                <input
                  ref={fileInputRef}
                  id="report-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onSelectImage}
                  className="sr-only"
                />

                {imageError ? (
                  <span className="field-error" role="alert">
                    {imageError}
                  </span>
                ) : (
                  <span className="field-hint">
                    Optional, but an image lets the AI classify the event visually and raises
                    the confidence of the assessment.
                  </span>
                )}
              </div>
            </section>

            {/* Sensor values ------------------------------------------------ */}
            <section className="report-form-section">
              <p className="report-form-section-title">Sensor readings (optional)</p>
              <p
                className="text-muted"
                style={{ fontSize: "var(--text-xs)", marginTop: -8, marginBottom: 14 }}
              >
                Only fill these in if you have an actual instrument reading. Leave blank
                otherwise — the engine handles missing values correctly and lowers its
                confidence accordingly.
              </p>

              <div className="sensor-grid">
                <Field label="PM2.5" htmlFor="report-pm25" error={errors.pm25?.message}>
                  <Input {...register("pm25")} type="number" step="any" placeholder="µg/m³" />
                </Field>
                <Field label="PM10" htmlFor="report-pm10" error={errors.pm10?.message}>
                  <Input {...register("pm10")} type="number" step="any" placeholder="µg/m³" />
                </Field>
                <Field
                  label="Temperature"
                  htmlFor="report-temperature"
                  error={errors.temperature?.message}
                >
                  <Input
                    {...register("temperature")}
                    type="number"
                    step="any"
                    placeholder="°C"
                  />
                </Field>
                <Field label="Humidity" htmlFor="report-humidity" error={errors.humidity?.message}>
                  <Input {...register("humidity")} type="number" step="any" placeholder="%" />
                </Field>
              </div>
            </section>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
function ReportResult({ result }: { result: AnalyzeResponse }) {
  const assessment = result.assessment;

  return (
    <div>
      <div className="pipeline-result" style={{ marginBottom: 20 }}>
        <div className="pipeline-result-head">
          <CheckCircle2 size={20} aria-hidden="true" style={{ color: "var(--success)" }} />
          <div>
            <p style={{ fontWeight: 650 }}>Pipeline complete</p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
              Analysed by {result.ai_provider}
            </p>
          </div>
        </div>
        <div className="pipeline-stages">
          {result.pipeline.map((stage) => (
            <span className="pipeline-stage" key={stage}>
              <CheckCircle2 size={12} aria-hidden="true" />
              {titleCase(stage)}
            </span>
          ))}
        </div>
      </div>

      {assessment ? (
        <>
          <div className="hotspot-detail-head">
            <div>
              <p style={{ fontSize: "var(--text-md)", fontWeight: 650 }}>
                {titleCase(assessment.event_type)}
              </p>
              <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
                Likely source: {titleCase(assessment.likely_source)}
              </p>
            </div>
            <div className="hotspot-detail-score">
              <p
                className="hotspot-detail-score-value"
                style={{ color: riskColor(assessment.risk_level) }}
              >
                {Math.round(assessment.risk_score)}
              </p>
              <p className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                risk / 100
              </p>
            </div>
          </div>

          <dl className="detail-list" style={{ marginBottom: 18 }}>
            <div className="detail-row">
              <dt className="detail-label">Risk level</dt>
              <dd className="detail-value" style={{ color: riskColor(assessment.risk_level) }}>
                {assessment.risk_level}
              </dd>
            </div>
            <div className="detail-row">
              <dt className="detail-label">Visual severity</dt>
              <dd className="detail-value">{titleCase(assessment.severity)}</dd>
            </div>
            <div className="detail-row">
              <dt className="detail-label">Confidence</dt>
              <dd className="detail-value">{Math.round(assessment.confidence * 100)}%</dd>
            </div>
            <div className="detail-row">
              <dt className="detail-label">Hotspot probability</dt>
              <dd className="detail-value">
                {Math.round(assessment.hotspot_probability * 100)}%
              </dd>
            </div>
          </dl>

          {assessment.ai_summary ? (
            <div className="assessment-block" style={{ marginBottom: 18 }}>
              <p className="assessment-summary">{assessment.ai_summary}</p>
            </div>
          ) : null}

          {assessment.visible_indicators?.length ? (
            <div style={{ marginBottom: 18 }}>
              <p className="hotspot-detail-section-title">Visible indicators</p>
              <div className="indicator-list">
                {assessment.visible_indicators.map((indicator) => (
                  <p className="indicator-item" key={indicator}>
                    <CheckCircle2 size={13} aria-hidden="true" />
                    {indicator}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {assessment.environmental_concerns?.length ? (
            <div style={{ marginBottom: 18 }}>
              <p className="hotspot-detail-section-title">Environmental concerns</p>
              <div className="indicator-list">
                {assessment.environmental_concerns.map((concern) => (
                  <p className="indicator-item" key={concern}>
                    <CheckCircle2 size={13} aria-hidden="true" />
                    {concern}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {assessment.recommended_action ? (
            <div className="hotspot-recommendation" style={{ marginBottom: 18 }}>
              <p className="hotspot-recommendation-title">Recommended action</p>
              {assessment.recommended_action}
            </div>
          ) : null}
        </>
      ) : (
        <InlineAlert variant="warning">
          The report was recorded, but no AI assessment was returned for it.
        </InlineAlert>
      )}

      {result.hotspot ? (
        <InlineAlert variant="info">
          A hotspot was raised at <strong>{result.hotspot.location_label}</strong> with a risk
          score of {Math.round(result.hotspot.risk_score)}.
        </InlineAlert>
      ) : null}

      {result.alert ? (
        <InlineAlert variant="warning">
          An authority alert was generated: <strong>{result.alert.title}</strong>
        </InlineAlert>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        <DataBadge mode="AI ASSESSMENT" />
        <DataBadge mode="MODELLED" />
      </div>

      <p
        className="text-muted"
        style={{ fontSize: "var(--text-xs)", lineHeight: 1.6, marginTop: 12 }}
      >
        This assessment interprets visual and contextual evidence. It is not a certified
        air-quality measurement and does not establish an AQI value.
      </p>
    </div>
  );
}
