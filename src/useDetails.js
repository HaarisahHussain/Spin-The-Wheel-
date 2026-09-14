import { useEffect, useState } from 'react';
import { useArcade } from './state';
export function useDetails(section, params = {}, enabled = true) {
  const { state } = useArcade();
  const [result, setResult] = useState({ data: null, error: '', loading: true });
  const query = new URLSearchParams({ section, ...params }).toString();
  const audience = location.pathname === '/host' ? 'host' : 'account';
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setResult((old) => ({ ...old, loading: true, error: '' }));
    let deadline;
    const timer = setTimeout(async () => {
      deadline = setTimeout(
        () =>
          controller.abort(
            new DOMException('Connection interrupted. Reopen this tab to retry.', 'TimeoutError'),
          ),
        10000,
      );
      try {
        const response = await fetch(`/api/details?${query}`, {
          headers: { 'X-Arcade-Audience': audience },
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'Unable to load results.');
        setResult({ data, error: '', loading: false });
      } catch (e) {
        if (e.name !== 'AbortError') setResult({ data: null, error: e.message, loading: false });
      } finally {
        clearTimeout(deadline);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [query, enabled, state?.dataVersion, state?.instanceId, state?.me?.id, state?.staff?.id]);
  return result;
}
