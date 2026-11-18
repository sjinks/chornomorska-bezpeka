import type { Article, Filters, SortOrder } from './catalog.ts';

export const normalize = (value: string | null | undefined): string =>
    (value ?? '')
        .normalize('NFKC')
        .toLocaleLowerCase('uk')
        .replace(/[’‘`ʼ]/gu, "'")
        .replace(/\s+/gu, ' ')
        .trim();

export const collator = new Intl.Collator('uk', {
    numeric: true,
    sensitivity: 'base',
});

export const NO_AUTHOR = 'no-author';
export const filterKeys = ['q', 'author', 'language', 'category', 'year', 'issue'] as const;
// Keep year for previously shared URLs; new searches use the issue selector.
export const defaults: Filters = {
    q: '',
    author: '',
    language: '',
    category: '',
    year: '',
    issue: '',
    sort: 'oldest',
    page: 1,
};

export function parseSort(value: string | null): SortOrder {
    if (value === 'newest' || value === 'title') {
        return value;
    }
    return 'oldest';
}

export function readFilters(search: string): Filters {
    const parameters = new URLSearchParams(search);
    return {
        q: parameters.get('q') ?? defaults.q,
        author: parameters.get('author') ?? defaults.author,
        language: parameters.get('language') ?? defaults.language,
        category: parameters.get('category') ?? defaults.category,
        year: parameters.get('year') ?? defaults.year,
        issue: parameters.get('issue') ?? defaults.issue,
        sort: parseSort(parameters.get('sort')),
        page: Math.max(1, Math.floor(Number(parameters.get('page'))) || 1),
    };
}

type IssueFields = Pick<Article, 'year' | 'issue' | 'issueTotal'>;

export interface IssueOption {
    value: string;
    label: string;
    year: string;
    number: string;
}

export function issueKey(article: IssueFields): string {
    return `${article.year}:${article.issueTotal || article.issue}`;
}

export function issueOptions(articles: readonly IssueFields[]): IssueOption[] {
    const issues = new Map<string, IssueOption>();
    for (const article of articles) {
        const value = issueKey(article);
        const number = article.issueTotal || article.issue;
        issues.set(value, {
            value,
            label: `${number} (${article.year})`,
            year: article.year,
            number,
        });
    }

    return [...issues.values()].sort(
        (left, right) => collator.compare(left.year, right.year) || collator.compare(left.number, right.number),
    );
}

export function articleCategories(article: Article): readonly string[] {
    return article.categories ?? (article.category ? [article.category] : []);
}

function matchesAuthor(article: Article, authorId: string): boolean {
    if (!authorId) {
        return true;
    }
    if (authorId === NO_AUTHOR) {
        return article.authorIds.length === 0;
    }

    const searchableAuthors = article.searchAuthorIds ?? article.authorIds;
    return searchableAuthors.includes(authorId);
}

function compareArticles(left: Article, right: Article, sort: SortOrder): number {
    const titleOrder = collator.compare(left.title, right.title);
    if (sort === 'title') {
        return titleOrder;
    }

    const chronologicalOrder =
        collator.compare(left.year, right.year) ||
        collator.compare(left.issue, right.issue) ||
        collator.compare(left.page, right.page);
    const direction = sort === 'newest' ? -1 : 1;

    return direction * chronologicalOrder || titleOrder;
}

export function filterArticles(articles: readonly Article[], filters: Filters): Article[] {
    const titleWords = normalize(filters.q).split(' ').filter(Boolean);

    function matchesFilters(article: Article): boolean {
        const title = normalize(article.title);
        const matchesTitle = titleWords.every((word) => title.includes(word));

        return (
            matchesTitle &&
            matchesAuthor(article, filters.author) &&
            (!filters.language || article.language === filters.language) &&
            (!filters.category || articleCategories(article).includes(filters.category)) &&
            (!filters.year || article.year === filters.year) &&
            (!filters.issue || issueKey(article) === filters.issue)
        );
    }

    const matchingArticles = articles.filter(matchesFilters);
    return matchingArticles.sort((left, right) => compareArticles(left, right, filters.sort));
}

export function safePdf(value: string): string | null {
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}
