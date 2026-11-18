export interface Author {
    id: string;
    name: string;
    aliases: string[];
}

export interface Article {
    id: string;
    title: string;
    authorIds: string[];
    searchAuthorIds?: string[];
    originalAuthors: string[];
    year: string;
    issue: string;
    issueTotal: string;
    page: string;
    category: string;
    categories?: string[];
    language: string;
    pdf: string;
}

export interface Catalog {
    authors: Author[];
    articles: Article[];
}

export type SortOrder = 'oldest' | 'newest' | 'title';

export interface Filters {
    q: string;
    author: string;
    language: string;
    category: string;
    year: string;
    issue: string;
    sort: SortOrder;
    page: number;
}
