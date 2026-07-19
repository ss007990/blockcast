import { useT } from '../../hooks';
import type { Lang } from '../../i18n';
import { useSettings, type ThemeChoice } from '../../state/settings';
import type { ClockFormat, UnitSystem } from '../../core/units';
import { Card, Field, Segmented } from '../../ui/primitives';

const APP_VERSION = '2.0.0';

export function SettingsView() {
  const t = useT();
  const st = useSettings();

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 620 }}>
      <Card>
        <h2 style={{ fontSize: 19, marginBottom: 16 }}>{t.settings.appearance}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t.settings.theme}>
            <Segmented<ThemeChoice>
              options={[
                { value: 'system', label: t.settings.themeSystem },
                { value: 'light', label: t.settings.themeLight },
                { value: 'dark', label: t.settings.themeDark },
              ]}
              value={st.theme}
              onChange={st.setTheme}
            />
          </Field>
          <Field label={t.settings.language}>
            <Segmented<Lang>
              options={[
                { value: 'en', label: 'English' },
                { value: 'fr', label: 'Français' },
              ]}
              value={st.lang}
              onChange={st.setLang}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: 19, marginBottom: 16 }}>{t.settings.unitsTitle}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t.settings.units}>
            <Segmented<UnitSystem>
              options={[
                { value: 'metric', label: t.settings.metric },
                { value: 'imperial', label: t.settings.imperial },
              ]}
              value={st.units}
              onChange={st.setUnits}
            />
          </Field>
          <Field label={t.settings.clock}>
            <Segmented<ClockFormat>
              options={[
                { value: '24h', label: '24 h' },
                { value: '12h', label: 'AM/PM' },
              ]}
              value={st.clock}
              onChange={st.setClock}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: 19, marginBottom: 12 }}>{t.settings.about}</h2>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          {t.settings.aboutBody}
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10 }}>
          {t.settings.version} {APP_VERSION} ·{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          ·{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
        </p>
      </Card>
    </div>
  );
}
