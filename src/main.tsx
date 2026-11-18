import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { defaults, filterKeys, issueOptions, readFilters } from './search.ts';
import type { Filters } from './catalog.ts';
import { AboutJournal } from './AboutJournal.tsx';
import { SearchResults } from './SearchResults.tsx';
import { useCatalog } from './useCatalog.ts';
import { SearchPanel } from './SearchPanel.tsx';
import { IssueGallery } from './IssueGallery.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

function App(): ReactElement {
    const { catalog, hasLoadError, retry } = useCatalog();
    const [filters, setFilters] = useState(() => readFilters(location.search));
    const [draft, setDraft] = useState(filters);

    useEffect(() => {
        const restoreFilters = (): void => {
            const restoredFilters = readFilters(location.search);
            setFilters(restoredFilters);
            setDraft(restoredFilters);
        };

        addEventListener('popstate', restoreFilters);
        return (): void => removeEventListener('popstate', restoreFilters);
    }, []);

    function applyFilters(nextFilters: Filters): void {
        const parameters = new URLSearchParams();

        for (const key of [...filterKeys, 'sort', 'page'] as const) {
            const value = nextFilters[key];
            if (value !== '' && value !== defaults[key]) {
                parameters.set(key, String(value));
            }
        }

        const query = parameters.size ? `?${parameters.toString()}` : '';
        history.pushState(null, '', `${location.pathname}${query}${location.hash}`);
        setFilters(nextFilters);
        setDraft(nextFilters);
    }

    const issues = issueOptions(catalog?.articles ?? []);

    function submitSearch(): void {
        applyFilters({ ...draft, page: 1 });
    }

    function selectIssue(issueValue: string): void {
        applyFilters({ ...filters, issue: issueValue, year: '', page: 1 });
    }

    function resetFilters(): void {
        applyFilters({ ...defaults });
    }

    return (
        <>
            <a className="visually-hidden-focusable skip" href="#results">
                До результатів пошуку
            </a>
            <main className="container pb-5">
                <section className="intro">
                    <div className="eyebrow">ЕЛЕКТРОННА БІБЛІОТЕКА · 2005–2013</div>
                    <h1>
                        Часопис <em>«Чорноморська Безпека»</em>. Севастопольський архів (2005—2013)
                    </h1>
                    <p>Статті севастопольських номерів журналу про безпеку, геополітику та Чорноморський регіон.</p>
                </section>
                <AboutJournal />
                {catalog && !hasLoadError && (
                    <IssueGallery issues={issues} selectedIssue={filters.issue} onSelect={selectIssue} />
                )}
                <div className="row g-4 align-items-start">
                    <SearchPanel
                        catalog={catalog}
                        draft={draft}
                        onChange={setDraft}
                        onSearch={submitSearch}
                        onReset={resetFilters}
                    />
                    <section className="col-lg-8 col-xl-9" id="results" aria-label="Результати пошуку">
                        <SearchResults
                            catalog={catalog}
                            hasLoadError={hasLoadError}
                            filters={filters}
                            onFiltersChange={applyFilters}
                            onRetry={retry}
                            onReset={resetFilters}
                        />
                    </section>
                </div>
            </main>
            <footer className="container footer">
                <span>Часопис «Чорноморська Безпека»</span>
                <span>Севастопольський архів (2005—2013)</span>
            </footer>
        </>
    );
}

const root = document.getElementById('root');
if (!root) {
    throw new Error('Missing application root element');
}
createRoot(root).render(<App />);
