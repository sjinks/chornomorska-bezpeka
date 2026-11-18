import type { Author } from '../src/catalog.ts';

export interface IndexedArticle {
    source_row: number;
    title: string;
    author_ids: string[];
    search_author_ids: string[];
    original_authors: string[];
    unresolved_name_tags: string[];
    separate_person_tags: string[];
    metadata: Record<string, string>;
}

export interface AuthorIndex {
    authors: Author[];
    articles: IndexedArticle[];
    distinct_people_confirmed_by_owner: [string, string][];
    pseudonyms_confirmed_by_owner: [string, string][];
}
