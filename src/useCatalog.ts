import { useEffect, useState } from 'react';
import type { Catalog } from './catalog.ts';

interface CatalogState {
    catalog: Catalog | null;
    hasLoadError: boolean;
    retry: () => void;
}

export function useCatalog(): CatalogState {
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [hasLoadError, setLoadError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoadError(false);

        fetch(`${import.meta.env.BASE_URL}catalog.json`, { signal: controller.signal })
            .then((response): Promise<Catalog> => {
                if (!response.ok) {
                    throw Error();
                }
                return response.json();
            })
            .then(setCatalog)
            .catch((error: unknown) => {
                if (!(error instanceof Error) || error.name !== 'AbortError') {
                    setLoadError(true);
                }
            });

        return (): void => controller.abort();
    }, [retryCount]);

    function retry(): void {
        setRetryCount((count) => count + 1);
    }

    return { catalog, hasLoadError, retry };
}
