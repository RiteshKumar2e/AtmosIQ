"use client";

import {
  Bell,
  Globe,
  LogOut,
  Save,
  SlidersHorizontal,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { DataBadge, PageHeader, ResponsibleAiNotice } from "@/components/dashboard/shared";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  InlineAlert,
  Input,
  Select,
  Switch,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { cn, initials, titleCase } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: SlidersHorizontal },
  { id: "preferences", label: "Preferences", icon: Globe },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * Preference storage.
 *
 * The backend exposes profile fields as read-only in this build, so display and
 * notification preferences are persisted locally per account. The Profile
 * section reflects the authoritative server-side identity.
 */
const PREF_KEY = "atmosiq.preferences";

interface Preferences {
  notifyEmail: boolean;
  notifyCritical: boolean;
  notifyDigest: boolean;
  notifyForecast: boolean;
  language: string;
  units: "metric" | "imperial";
  timeFormat: "24h" | "12h";
}

const DEFAULT_PREFS: Preferences = {
  notifyEmail: true,
  notifyCritical: true,
  notifyDigest: true,
  notifyForecast: false,
  language: "en",
  units: "metric",
  timeFormat: "24h",
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();

  const [section, setSection] = useState<SectionId>("profile");
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREF_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      /* Storage unavailable: fall back to defaults for this session. */
    }
  }, []);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
      setDirty(false);
      toast.success("Preferences saved", "Your settings have been applied.");
    } catch {
      toast.error("Could not save", "This browser is blocking local storage.");
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, notification routing and display preferences."
        actions={
          <Button onClick={save} disabled={!dirty}>
            <Save size={16} aria-hidden="true" />
            Save changes
          </Button>
        }
      />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn("settings-nav-link", section === item.id && "is-active")}
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? "true" : undefined}
            >
              <item.icon size={16} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="settings-panels">
          {/* Profile ------------------------------------------------------- */}
          {section === "profile" ? (
            <Card>
              <CardHeader
                title="Profile"
                subtitle="Your identity as recorded by the AtmosIQ backend."
              />
              <CardBody>
                <div className="settings-identity">
                  <span className="settings-avatar" aria-hidden="true">
                    {initials(user?.name)}
                  </span>
                  <div>
                    <p className="settings-identity-name">{user?.name ?? "—"}</p>
                    <p className="settings-identity-meta">{user?.email ?? "—"}</p>
                  </div>
                </div>

                <div className="settings-grid">
                  <Field label="Full name" htmlFor="profile-name">
                    <Input value={user?.name ?? ""} readOnly />
                  </Field>
                  <Field label="Email" htmlFor="profile-email">
                    <Input value={user?.email ?? ""} readOnly />
                  </Field>
                  <Field label="Organization" htmlFor="profile-org">
                    <Input value={user?.organisation ?? "Not provided"} readOnly />
                  </Field>
                  <Field
                    label="Role"
                    htmlFor="profile-role"
                    hint="Role changes are made by an administrator."
                  >
                    <Input value={titleCase(user?.role ?? "citizen")} readOnly />
                  </Field>
                  <Field label="Country" htmlFor="profile-country">
                    <Input value={user?.country_code ?? "—"} readOnly />
                  </Field>
                  <Field label="Region" htmlFor="profile-region">
                    <Input value={user?.region_code ?? "—"} readOnly />
                  </Field>
                </div>

                <InlineAlert variant="info">
                  Profile fields are managed server-side in this prototype build. Contact an
                  administrator to change your name, organisation or assigned role.
                </InlineAlert>
              </CardBody>
            </Card>
          ) : null}

          {/* Notifications ------------------------------------------------- */}
          {section === "notifications" ? (
            <Card>
              <CardHeader
                title="Notifications"
                subtitle="Choose which early warnings reach you and how often."
                action={<DataBadge mode="SIMULATED" />}
              />
              <CardBody>
                <ToggleRow
                  id="notify-email"
                  label="Email notifications"
                  text="Receive alerts and summaries at your registered email address."
                  checked={prefs.notifyEmail}
                  onChange={(value) => update("notifyEmail", value)}
                />
                <ToggleRow
                  id="notify-critical"
                  label="Critical alerts only"
                  text="Limit notifications to the critical severity band, suppressing lower-priority events."
                  checked={prefs.notifyCritical}
                  onChange={(value) => update("notifyCritical", value)}
                />
                <ToggleRow
                  id="notify-digest"
                  label="Daily digest"
                  text="A single morning summary of overnight hotspots and unresolved alerts."
                  checked={prefs.notifyDigest}
                  onChange={(value) => update("notifyDigest", value)}
                />
                <ToggleRow
                  id="notify-forecast"
                  label="Forecast warnings"
                  text="Notify when the six-hour projection crosses into the high risk band."
                  checked={prefs.notifyForecast}
                  onChange={(value) => update("notifyForecast", value)}
                />

                <InlineAlert variant="info">
                  Prototype limitation: notification delivery is simulated. Preferences are
                  stored and honoured by the interface, but no email is dispatched.
                </InlineAlert>
              </CardBody>
            </Card>
          ) : null}

          {/* Security ------------------------------------------------------ */}
          {section === "security" ? (
            <Card>
              <CardHeader
                title="Security"
                subtitle="Session and access controls for this account."
              />
              <CardBody>
                <div className="settings-grid">
                  <Field
                    label="Authentication"
                    htmlFor="security-auth"
                    hint="Sessions use a signed JWT issued by the backend."
                  >
                    <Input value="JWT bearer token" readOnly />
                  </Field>
                  <Field
                    label="Account type"
                    htmlFor="security-type"
                    hint={
                      user?.is_demo
                        ? "Demo accounts are shared and reset periodically."
                        : "Standard account."
                    }
                  >
                    <Input value={user?.is_demo ? "Demo account" : "Standard"} readOnly />
                  </Field>
                </div>

                <InlineAlert variant="warning">
                  Password changes are not exposed in this prototype build. Use the forgot
                  password flow to request a reset.
                </InlineAlert>

                <div className="settings-danger">
                  <p className="settings-danger-title">
                    <LogOut size={16} aria-hidden="true" />
                    End this session
                  </p>
                  <p className="settings-danger-text">
                    Signing out discards the access token stored in this browser. Any other
                    signed-in devices are unaffected.
                  </p>
                  <Button variant="danger" onClick={logout}>
                    <LogOut size={16} aria-hidden="true" />
                    Sign out
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* Preferences --------------------------------------------------- */}
          {section === "preferences" ? (
            <Card>
              <CardHeader
                title="Preferences"
                subtitle="Language, units and formatting used across the interface."
              />
              <CardBody>
                <div className="settings-grid">
                  <Field
                    label="Language"
                    htmlFor="pref-language"
                    hint="Interface language for this deployment node."
                  >
                    <Select
                      value={prefs.language}
                      onChange={(event) => update("language", event.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="pt">Português (Brazil)</option>
                      <option value="ru">Русский (Russian)</option>
                      <option value="zh">中文 (Chinese)</option>
                    </Select>
                  </Field>

                  <Field
                    label="Measurement units"
                    htmlFor="pref-units"
                    hint="Metric is the reference standard for air-quality reporting."
                  >
                    <Select
                      value={prefs.units}
                      onChange={(event) =>
                        update("units", event.target.value as "metric" | "imperial")
                      }
                    >
                      <option value="metric">Metric (µg/m³, °C, m/s)</option>
                      <option value="imperial">Imperial (µg/m³, °F, mph)</option>
                    </Select>
                  </Field>

                  <Field label="Time format" htmlFor="pref-time">
                    <Select
                      value={prefs.timeFormat}
                      onChange={(event) =>
                        update("timeFormat", event.target.value as "24h" | "12h")
                      }
                    >
                      <option value="24h">24-hour (18:00)</option>
                      <option value="12h">12-hour (6:00 PM)</option>
                    </Select>
                  </Field>
                </div>

                <InlineAlert variant="info">
                  Language selection changes the interface locale for supported strings.
                  Pollutant units remain in µg/m³ regardless of the unit setting, since that
                  is the international reporting standard.
                </InlineAlert>
              </CardBody>
            </Card>
          ) : null}

          {dirty ? (
            <div className="settings-actions">
              <Button onClick={save}>
                <Save size={16} aria-hidden="true" />
                Save changes
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPrefs(DEFAULT_PREFS);
                  setDirty(true);
                }}
              >
                Reset to defaults
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <ResponsibleAiNotice />
    </>
  );
}

/* -------------------------------------------------------------------------- */
function ToggleRow({
  id,
  label,
  text,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="settings-toggle-row">
      <div>
        <label className="settings-toggle-label" htmlFor={id}>
          {label}
        </label>
        <p className="settings-toggle-text">{text}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
