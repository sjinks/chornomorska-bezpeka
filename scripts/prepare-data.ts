import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Article, Catalog } from '../src/catalog.ts';
import type { AuthorIndex, IndexedArticle } from './author-index.ts';

function prepareArticle(article: IndexedArticle): Article {
    const metadata = article.metadata;
    const bibliographicFields = [
        metadata['Рік'],
        metadata['№ '],
        metadata['(№)'],
        metadata['Сторінка'],
        metadata['Назва статті'],
    ];
    const id = createHash('sha256').update(JSON.stringify(bibliographicFields)).digest('hex').slice(0, 16);

    const category = metadata['Рубрика'].trim();
    const additionalCategories = (metadata['Додаткові рубрики'] || '').split('\n').map((value) => value.trim());
    const categories = [...new Set([category, ...additionalCategories].filter(Boolean))];

    return {
        id,
        title: metadata['Назва статті'].trim(),
        authorIds: article.author_ids,
        searchAuthorIds: article.search_author_ids,
        originalAuthors: article.original_authors,
        year: metadata['Рік'].trim(),
        issue: metadata['№ '].trim(),
        issueTotal: metadata['(№)'].trim(),
        page: metadata['Сторінка'].trim(),
        category,
        categories,
        language: metadata['Мова публікації'].trim(),
        pdf: (metadata.PDF || '').trim(),
    };
}

const source: AuthorIndex = JSON.parse(
    readFileSync(new URL('../author-linking/author-index.json', import.meta.url), 'utf8'),
);
const articles = source.articles.map(prepareArticle);
const articleIds = new Set(articles.map((article) => article.id));

if (articleIds.size !== articles.length) {
    throw Error('Duplicate article IDs');
}

const catalog: Catalog = {
    authors: source.authors.map(({ id, name, aliases }) => ({ id, name, aliases })),
    articles,
};

writeFileSync(new URL('../public/catalog.json', import.meta.url), JSON.stringify(catalog));
console.log(`Prepared ${articles.length} articles`);
