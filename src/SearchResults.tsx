import { useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { Catalog, Filters } from './catalog.ts';
import { ArticleCard } from './ArticleCard.tsx';
import { IssueCover } from './IssueCover.tsx';
import { NO_AUTHOR, filterArticles, filterKeys, issueKey, issueOptions, parseSort } from './search.ts';

const PAGE_SIZE = 20;

interface SearchResultsProps {
    readonly catalog: Catalog | null;
    readonly hasLoadError: boolean;
    readonly filters: Filters;
    readonly onFiltersChange: (filters: Filters) => void;
    readonly onRetry: () => void;
    readonly onReset: () => void;
}

export function SearchResults({
    catalog,
    hasLoadError,
    filters,
    onFiltersChange,
    onRetry,
    onReset,
}: SearchResultsProps): ReactElement {
    const results = useMemo(() => (catalog ? filterArticles(catalog.articles, filters) : []), [catalog, filters]);

    if (hasLoadError) {
        return (
            <div className="alert alert-danger" role="alert">
                Не вдалося завантажити каталог.{' '}
                <button className="btn btn-outline-danger btn-sm" onClick={onRetry}>
                    Спробувати ще раз
                </button>
            </div>
        );
    }

    if (!catalog) {
        return (
            <div role="status" className="py-5 text-center">
                <span className="spinner-border spinner-border-sm me-2" />
                Завантаження каталогу…
            </div>
        );
    }

    const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const page = Math.min(filters.page, pages);
    const firstResultIndex = (page - 1) * PAGE_SIZE;
    const lastResultIndex = Math.min(page * PAGE_SIZE, results.length);
    const visibleArticles = results.slice(firstResultIndex, lastResultIndex);
    const resultRange = results.length ? `${firstResultIndex + 1}–${lastResultIndex}` : '0';
    const resultsTitle = filterKeys.some((key) => filters[key]) ? 'Результати пошуку' : 'Усі публікації';

    const authors = catalog.authors;
    const authorsById = new Map(authors.map((author) => [author.id, author]));
    const issues = issueOptions(catalog.articles);
    const selectedIssue = issues.find((issue) => issue.value === filters.issue);
    const selectedIssueArticleCount = catalog.articles.filter((article) => issueKey(article) === filters.issue).length;

    function filterLabel(key: (typeof filterKeys)[number]): string {
        if (key === 'author') {
            return filters.author === NO_AUTHOR
                ? 'Без автора'
                : (authorsById.get(filters.author)?.name ?? 'Невідомий автор');
        }

        if (key === 'issue') {
            return issues.find((issue) => issue.value === filters.issue)?.label ?? filters.issue;
        }

        return filters[key];
    }

    function selectAuthor(authorId: string): void {
        onFiltersChange({ ...filters, author: authorId, page: 1 });
    }

    function changeSort(event: ChangeEvent<HTMLSelectElement>): void {
        onFiltersChange({ ...filters, sort: parseSort(event.target.value), page: 1 });
    }

    function removeFilter(key: (typeof filterKeys)[number]): void {
        onFiltersChange({ ...filters, [key]: '', page: 1 });
    }

    function changePage(nextPage: number): void {
        onFiltersChange({ ...filters, page: nextPage });
    }

    return (
        <>
            {selectedIssue && (
                <div className="selected-issue">
                    <IssueCover issue={selectedIssue} />
                    <div>
                        <div className="eyebrow">ВИБРАНИЙ НОМЕР</div>
                        <h2 className="h4">№ {selectedIssue.label}</h2>
                        <p className="help mb-0">Публікацій у номері: {selectedIssueArticleCount}</p>
                    </div>
                </div>
            )}
            <div className="results-toolbar">
                <div aria-live="polite">
                    <h2 className="h4 mb-1">{resultsTitle}</h2>
                    <span className="text-secondary small">
                        Знайдено: {results.length} · {resultRange} з {results.length}
                    </span>
                </div>
                <div>
                    <label className="visually-hidden" htmlFor="sort">
                        Сортування
                    </label>
                    <select id="sort" className="form-select form-select-sm" value={filters.sort} onChange={changeSort}>
                        <option value="oldest">Спочатку давніші</option>
                        <option value="newest">Спочатку новіші</option>
                        <option value="title">За назвою</option>
                    </select>
                </div>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
                {filterKeys
                    .filter((key) => filters[key])
                    .map((key) => (
                        <button
                            className="filter-chip"
                            key={key}
                            onClick={() => removeFilter(key)}
                            aria-label={`Прибрати фільтр: ${filterLabel(key)}`}
                        >
                            {filterLabel(key)} <span aria-hidden="true">×</span>
                        </button>
                    ))}
            </div>
            {!results.length ? (
                <div className="empty-state">
                    <span aria-hidden="true">⌕</span>
                    <h3>Публікацій не знайдено</h3>
                    <p>Спробуйте інші слова або зменште кількість фільтрів.</p>
                    <button className="btn btn-outline-primary" onClick={onReset}>
                        Показати весь каталог
                    </button>
                </div>
            ) : (
                <div className="article-list">
                    {visibleArticles.map((article) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            authorsById={authorsById}
                            onAuthorSelect={selectAuthor}
                        />
                    ))}
                </div>
            )}
            {pages > 1 && (
                <nav className="pagination-bar" aria-label="Сторінки результатів">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={page === 1}
                        onClick={() => changePage(page - 1)}
                    >
                        ← Назад
                    </button>
                    <span>
                        Сторінка {page} з {pages}
                    </span>
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={page === pages}
                        onClick={() => changePage(page + 1)}
                    >
                        Далі →
                    </button>
                </nav>
            )}
        </>
    );
}
