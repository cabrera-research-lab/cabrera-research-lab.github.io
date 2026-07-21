import { useCallback, useEffect, useState } from 'react';
import {
  loadOrgSettings,
  saveOrgPrompts,
  saveOrgStatement,
  type OrgPrompts,
  type OrgSettings,
  type OrgStatement,
} from '@/apps/teaming/lib/orgSettings';

export function useOrgSettings() {
  const [settings, setSettings] = useState<OrgSettings>(() => loadOrgSettings());

  useEffect(() => {
    function refresh() {
      setSettings(loadOrgSettings());
    }
    window.addEventListener('goatnet-settings-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('goatnet-settings-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const updateStatement = useCallback((statement: OrgStatement) => {
    setSettings(saveOrgStatement(statement));
  }, []);

  const updatePrompts = useCallback((prompts: OrgPrompts) => {
    setSettings(saveOrgPrompts(prompts));
  }, []);

  return { settings, updateStatement, updatePrompts };
}
