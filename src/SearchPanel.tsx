import type { Dispatch, ReactElement, SetStateAction, SubmitEvent } from 'react';
import type { Catalog, Filters } from './catalog.ts';
import { NO_AUTHOR, articleCategories, collator, issueOptions } from './search.ts';

const selectFields = [
    ['language', 'Мова публікації', 'Усі мови'],
    ['category', 'Рубрика', 'Усі рубрики'],
] as const;

type TextFilter = 'q' | 'author' | 'language' | 'category';

interface SearchPanelProps {
    readonly catalog: Catalog | null;
    readonly draft: Filters;
    readonly onChange: Dispatch<SetStateAction<Filters>>;
    readonly onSearch: () => void;
    readonly onReset: () => void;
}

export function SearchPanel({ catalog, draft, onChange, onSearch, onReset }: SearchPanelProps): ReactElement {
    const articles = catalog?.articles ?? [];
    const authors = [...(catalog?.authors ?? [])].sort((left, right) => collator.compare(left.name, right.name));
    const issues = issueOptions(articles);

    function updateField(key: TextFilter, value: string): void {
        onChange((currentDraft) => ({ ...currentDraft, [key]: value }));
    }

    function updateIssue(value: string): void {
        onChange((currentDraft) => ({ ...currentDraft, issue: value, year: '' }));
    }

    function submitSearch(event: SubmitEvent<HTMLFormElement>): void {
        event.preventDefault();
        onSearch();
    }

    function optionsFor(key: 'language' | 'category'): string[] {
        const values =
            key === 'category'
                ? articles.flatMap(articleCategories)
                : articles.map((article) => article.language).filter(Boolean);
        return [...new Set(values)].sort(collator.compare);
    }

    return (
        <aside className="col-lg-4 col-xl-3">
            <form className="search-panel" onSubmit={submitSearch}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="h5 m-0">Пошук у каталозі</h2>
                    <span aria-hidden="true">⌕</span>
                </div>
                <label className="form-label" htmlFor="title">
                    Слова в назві
                </label>
                <input
                    id="title"
                    className="form-control mb-3"
                    placeholder="Наприклад, Крим або безпека"
                    value={draft.q}
                    onChange={(event) => updateField('q', event.target.value)}
                />
                <label className="form-label" htmlFor="author">
                    Автор
                </label>
                <select
                    id="author"
                    className="form-select mb-3"
                    value={draft.author}
                    onChange={(event) => updateField('author', event.target.value)}
                >
                    <option value="">Усі автори</option>
                    <option value={NO_AUTHOR}>Без автора</option>
                    {authors.map((author) => (
                        <option key={author.id} value={author.id}>
                            {author.name}
                        </option>
                    ))}
                </select>
                {selectFields.map(([key, label, all]) => (
                    <div className="mb-3" key={key}>
                        <label className="form-label" htmlFor={key}>
                            {label}
                        </label>
                        <select
                            id={key}
                            className="form-select"
                            value={draft[key]}
                            onChange={(event) => updateField(key, event.target.value)}
                        >
                            <option value="">{all}</option>
                            {optionsFor(key).map((value) => (
                                <option key={value}>{value}</option>
                            ))}
                        </select>
                    </div>
                ))}
                <div className="mb-3">
                    <label className="form-label" htmlFor="issue">
                        Номер
                    </label>
                    <select
                        id="issue"
                        className="form-select"
                        value={draft.issue}
                        onChange={(event) => updateIssue(event.target.value)}
                    >
                        <option value="">Усі номери</option>
                        {issues.map((issue) => (
                            <option key={issue.value} value={issue.value}>
                                {issue.label}
                            </option>
                        ))}
                    </select>
                </div>
                <button className="btn btn-primary w-100 mt-2" disabled={!catalog}>
                    Знайти публікації
                </button>
                <button className="btn btn-link w-100 mt-2 reset" type="button" onClick={onReset}>
                    Скинути фільтри
                </button>
            </form>
            <p className="aside-note">Каталог містить публікації мовами оригіналу. PDF-файли додаються поступово.</p>
        </aside>
    );
}
