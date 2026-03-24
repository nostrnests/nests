---
name: plausible-analytics
description: Add Plausible Analytics tracking to the application, configured through AppConfig and environment variables.
---

# Plausible Analytics

Add privacy-friendly analytics with [Plausible](https://plausible.io/) using the `@plausible-analytics/tracker` npm package. Configuration lives in `AppConfig` so it can be set via `VITE_` environment variables.

## 1. Install the package

```bash
npm install @plausible-analytics/tracker
```

## 2. Add fields to `AppConfig`

In `src/contexts/AppContext.ts`, add two fields to the `AppConfig` interface:

```typescript
export interface AppConfig {
  // ...existing fields...
  /** Plausible Analytics domain (empty string = disabled). */
  plausibleDomain: string;
  /** Plausible Analytics API endpoint (empty string = use default). */
  plausibleEndpoint: string;
}
```

## 3. Update the Zod schema in `AppProvider.tsx`

Add the new fields to the `AppConfigSchema`:

```typescript
const AppConfigSchema = z.object({
  // ...existing fields...
  plausibleDomain: z.string(),
  plausibleEndpoint: z.string(),
}) satisfies z.ZodType<AppConfig>;
```

## 4. Create `PlausibleProvider`

Create `src/components/PlausibleProvider.tsx`:

```tsx
import { ReactNode, useEffect, useRef } from 'react';
import { useAppContext } from '@/hooks/useAppContext';

interface PlausibleProviderProps {
  children: ReactNode;
}

/**
 * Reactively initializes Plausible Analytics from AppConfig.
 * Plausible's `init()` can only be called once, so we guard with a ref.
 */
export function PlausibleProvider({ children }: PlausibleProviderProps) {
  const { config } = useAppContext();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !config.plausibleDomain) return;
    initializedRef.current = true;

    import('@plausible-analytics/tracker').then(({ init }) => {
      init({
        domain: config.plausibleDomain,
        ...(config.plausibleEndpoint && { endpoint: config.plausibleEndpoint }),
      });
    }).catch(console.error);
  }, [config.plausibleDomain, config.plausibleEndpoint]);

  return <>{children}</>;
}
```

## 5. Wire into `App.tsx`

Import `PlausibleProvider` and add it inside `AppProvider` (it needs access to `useAppContext`):

```tsx
import { PlausibleProvider } from '@/components/PlausibleProvider';

// In the defaultConfig, add:
const defaultConfig: AppConfig = {
  // ...existing fields...
  plausibleDomain: import.meta.env.VITE_PLAUSIBLE_DOMAIN || '',
  plausibleEndpoint: import.meta.env.VITE_PLAUSIBLE_ENDPOINT || '',
};

// In the JSX, wrap children of AppProvider:
<AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig}>
  <PlausibleProvider>
    {/* ...rest of providers... */}
  </PlausibleProvider>
</AppProvider>
```

## 6. Update `TestApp.tsx`

Add the new fields to the test default config with empty strings (disabled):

```typescript
const defaultConfig: AppConfig = {
  // ...existing fields...
  plausibleDomain: '',
  plausibleEndpoint: '',
};
```

## 7. Configure via environment variables

Create or update `.env`:

```
VITE_PLAUSIBLE_DOMAIN="example.com"
VITE_PLAUSIBLE_ENDPOINT="https://plausible.example.com/api/event"
```

`VITE_PLAUSIBLE_ENDPOINT` is optional -- it defaults to Plausible Cloud's endpoint if omitted. Set it when using a self-hosted Plausible instance.
