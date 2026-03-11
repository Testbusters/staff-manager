'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

type Setting = {
  id: string;
  event_key: string;
  recipient_role: string;
  label: string;
  inapp_enabled: boolean;
  email_enabled: boolean;
};

const SECTIONS: { title: string; keys: string[] }[] = [
  {
    title: 'Compensi',
    keys: ['comp_inviato', 'comp_approvato', 'comp_rifiutato', 'comp_pagato'],
  },
  {
    title: 'Rimborsi',
    keys: ['rimborso_inviato', 'rimborso_approvato', 'rimborso_rifiutato', 'rimborso_pagato'],
  },
  {
    title: 'Documenti',
    keys: ['documento_da_firmare', 'documento_firmato'],
  },
  {
    title: 'Ticket',
    keys: ['ticket_creato', 'ticket_risposta', 'ticket_risposta_collab', 'ticket_stato'],
  },
  {
    title: 'Contenuti',
    keys: ['comunicazione_pubblicata', 'evento_pubblicato', 'opportunita_pubblicata', 'sconto_pubblicato'],
  },
];

const ROLE_LABELS: Record<string, string> = {
  collaboratore:         'Collaboratore',
  responsabile_compensi: 'Responsabile Compensi',
  amministrazione:       'Amministrazione',
};


export default function NotificationSettingsManager({
  initialSettings,
}: {
  initialSettings: Setting[];
}) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [saving, setSaving] = useState<string | null>(null);

  const handleToggle = useCallback(async (
    setting: Setting,
    field: 'inapp_enabled' | 'email_enabled',
    value: boolean,
  ) => {
    const key = `${setting.event_key}:${field}`;
    setSaving(key);

    // Optimistic update
    setSettings(prev =>
      prev.map(s =>
        s.event_key === setting.event_key && s.recipient_role === setting.recipient_role
          ? { ...s, [field]: value }
          : s,
      ),
    );

    const res = await fetch('/api/admin/notification-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_key: setting.event_key,
        recipient_role: setting.recipient_role,
        field,
        value,
      }),
    });

    if (!res.ok) {
      // Revert on failure
      setSettings(prev =>
        prev.map(s =>
          s.event_key === setting.event_key && s.recipient_role === setting.recipient_role
            ? { ...s, [field]: !value }
            : s,
        ),
      );
      toast.error('Errore nel salvataggio. Riprova.', { duration: 5000 });
    }
    setSaving(null);
  }, []);

  return (
    <div className="space-y-8">
      {SECTIONS.map(section => {
        const sectionSettings = settings.filter(s =>
          section.keys.includes(s.event_key),
        );
        if (sectionSettings.length === 0) return null;

        return (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {section.title}
            </h3>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Evento</span>
                <span className="text-xs text-muted-foreground w-24 text-center">Destinatario</span>
                <span className="text-xs text-muted-foreground w-16 text-center">In-app</span>
                <span className="text-xs text-muted-foreground w-16 text-center">Email</span>
              </div>

              {sectionSettings.map((s, i) => {
                const isLast = i === sectionSettings.length - 1;
                return (
                  <div
                    key={`${s.event_key}:${s.recipient_role}`}
                    className={
                      'grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 ' +
                      (!isLast ? 'border-b border-border/30' : '')
                    }
                  >
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className="w-24 text-center">
                      <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] text-foreground">
                        {ROLE_LABELS[s.recipient_role] ?? s.recipient_role}
                      </span>
                    </span>
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={s.inapp_enabled}
                        onCheckedChange={v => handleToggle(s, 'inapp_enabled', v)}
                        disabled={saving === `${s.event_key}:inapp_enabled`}
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={s.email_enabled}
                        onCheckedChange={v => handleToggle(s, 'email_enabled', v)}
                        disabled={saving === `${s.event_key}:email_enabled`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Le modifiche vengono salvate automaticamente. In-app = notifica nel campanello; Email = invio email transazionale.
      </p>
    </div>
  );
}
