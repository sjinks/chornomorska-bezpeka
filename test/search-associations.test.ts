import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Article, Catalog } from '../src/catalog.ts';
import { ArticleCard } from '../src/ArticleCard.tsx';
import { articleCategories, defaults, filterArticles } from '../src/search.ts';

const catalog: Catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
const authorsById = new Map(catalog.authors.map((author) => [author.id, author]));

function articleByTitle(title: string): Article {
    const article = catalog.articles.find((candidate) => candidate.title === title);
    assert.ok(article, `Missing article: ${title}`);
    return article;
}

function authorId(name: string): string {
    const author = catalog.authors.find((candidate) => candidate.name === name);
    assert.ok(author, `Missing author: ${name}`);
    return author.id;
}

function renderArticle(article: Article): string {
    return renderToStaticMarkup(createElement(ArticleCard, { article, authorsById, onAuthorSelect: () => undefined }));
}

test('an uncredited review matches both its search-only author and no-author filters', () => {
    const article = articleByTitle('Рустам Мамедов о международно-правовом статусе Каспийского моря');
    assert.deepEqual(article.authorIds, []);
    assert.deepEqual(article.originalAuthors, []);
    assert.ok(filterArticles(catalog.articles, { ...defaults, author: 'no-author' }).includes(article));
    assert.ok(filterArticles(catalog.articles, { ...defaults, author: authorId('Мамедов Рустам') }).includes(article));
    const markup = renderArticle(article);
    assert.match(markup, /Авторство не зазначено/u);
    assert.ok(!markup.includes('author-link'));
});

test('search-only interviewers never replace or merge the credited person', () => {
    const article = catalog.articles.find((candidate) => candidate.title.startsWith('Юрій Юзько:'));
    assert.ok(article);
    const credited = authorId('Юзько Юрій');
    const interviewer = authorId('Лакійчук Павло');
    assert.notEqual(credited, interviewer);
    assert.deepEqual(article.authorIds, [credited]);
    assert.ok(filterArticles(catalog.articles, { ...defaults, author: interviewer }).includes(article));
    const markup = renderArticle(article);
    assert.ok(markup.includes('Юзько Юрій'));
    assert.ok(!markup.includes('Лакійчук Павло'));

    const commentary = articleByTitle(
        'Кое-что о НАТО, гражданской безопасности Украины и «украиноведческих студиях» господина Филатова',
    );
    assert.deepEqual(commentary.authorIds, [authorId('Лосєв Ігор')]);
    assert.ok(
        filterArticles(catalog.articles, { ...defaults, author: authorId('Філатов Анатолій') }).includes(commentary),
    );
    assert.ok(!renderArticle(commentary).includes('Філатов Анатолій'));
});

test('additional categories preserve the printed category and combine with author filtering', () => {
    const article = catalog.articles.find((candidate) =>
        candidate.title.startsWith('Україна і Словаччина в посткризовій'),
    );
    assert.ok(article);
    assert.equal(article.category, 'Енергетична безпека');
    assert.deepEqual(articleCategories(article), ['Енергетична безпека', 'Критика і бібліографія']);
    for (const category of articleCategories(article)) {
        const found = filterArticles(catalog.articles, { ...defaults, category, author: authorId('Гончар Михайло') });
        assert.ok(found.includes(article));
    }
    assert.deepEqual(article.authorIds, []);
    const markup = renderArticle(article);
    assert.ok(markup.includes('Енергетична безпека'));
    assert.ok(markup.includes('Критика і бібліографія'));
    assert.equal(catalog.articles.filter((candidate) => articleCategories(candidate).length > 1).length, 7);
});

test('a separately confirmed person can be searchable without appearing in the credits', () => {
    const article = articleByTitle('Український національний рух у Севастополі на початку ХХ століття');
    assert.deepEqual(article.authorIds, [authorId('Рогожин Дмитро')]);
    assert.ok(filterArticles(catalog.articles, { ...defaults, author: authorId('Майорова Аліна') }).includes(article));
    assert.ok(!renderArticle(article).includes('Майорова Аліна'));
});

test('a search-only name variant reuses the existing credited author entity', () => {
    const author = catalog.authors.find((candidate) => candidate.name === 'Беліцер Наталя');
    assert.ok(author);
    assert.ok(author.aliases.includes('Беліцер Наталія'));
    assert.ok(!catalog.authors.some((candidate) => candidate.name === 'Беліцер Наталія'));
    const article = articleByTitle('Some Questions About the Situation in Romania');
    assert.deepEqual(article.authorIds, []);
    assert.ok(filterArticles(catalog.articles, { ...defaults, author: author.id }).includes(article));
});
