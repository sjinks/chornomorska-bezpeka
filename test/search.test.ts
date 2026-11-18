import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    collator,
    defaults,
    filterArticles,
    issueOptions,
    NO_AUTHOR,
    normalize,
    readFilters,
    safePdf,
} from '../src/search.ts';
import type { Article, Catalog } from '../src/catalog.ts';
import type { AuthorIndex } from '../scripts/author-index.ts';

const index: AuthorIndex = JSON.parse(
    readFileSync(new URL('../author-linking/author-index.json', import.meta.url), 'utf8'),
);
const articles: Article[] = index.articles.map((a) => ({
    ...a,
    id: String(a.source_row),
    pdf: a.metadata.PDF ?? '',
    originalAuthors: a.original_authors,
    authorIds: a.author_ids,
    searchAuthorIds: a.search_author_ids,
    issueTotal: a.metadata['(№)'],
    title: a.title,
    language: a.metadata['Мова публікації'].trim(),
    category: a.metadata['Рубрика'].trim(),
    year: a.metadata['Рік'],
    issue: a.metadata['№ '],
    page: a.metadata['Сторінка'],
}));

test('real catalog: multilingual author and coauthors', () => {
    const author = index.authors.find((a) => a.aliases.includes('Chitadze Nika'));
    assert.ok(author);
    assert.ok(author.aliases.includes('Читадзе Ника'));
    const found = filterArticles(articles, { ...defaults, author: author.id });
    assert.equal(found.length, 9);
    assert.ok(new Set(found.map((a) => a.language)).size > 1);
    const kulik = index.authors.find((a) => a.aliases.includes('Кулик Сергей'));
    assert.ok(kulik);
    assert.ok(filterArticles(articles, { ...defaults, author: kulik.id }).some((a) => a.authorIds.length > 1));
});

test('combined filters and every title word', () => {
    const filters = {
        ...defaults,
        q: 'КРИМ України',
        language: 'українська',
        category: 'Економічна і регіональна політика',
    };
    const found = filterArticles(articles, filters);
    assert.ok(found.length > 0);
    assert.ok(
        found.every(
            (a) =>
                normalize(a.title).includes('крим') &&
                normalize(a.title).includes('україни') &&
                a.language === filters.language &&
                a.category === filters.category,
        ),
    );
    assert.equal(filterArticles(articles, { ...defaults, q: 'неіснуючеслово123' }).length, 0);
});

test('source author credits and unrelated people remain distinct', () => {
    const getAuthor = (name: string) => {
        const author = index.authors.find((a) => a.aliases.includes(name));
        assert.ok(author, `Missing author: ${name}`);
        return author;
    };
    assert.notEqual(getAuthor('Стрелецкий Алексей').id, getAuthor('Бессарабов Алексей').id);
    assert.ok(!getAuthor('Рогожин Дмитро').aliases.includes('Майорова Аліна'));
});

test('URL parsing and safe PDF links', () => {
    assert.equal(readFilters('?page=-5').page, 1);
    assert.equal(readFilters('?sort=invalid').sort, 'oldest');
    assert.equal(readFilters('?sort=newest').sort, 'newest');
    assert.equal(readFilters('?sort=title').sort, 'title');
    assert.equal(readFilters('?q=Крим&language=українська').q, 'Крим');
    assert.equal(safePdf('javascript:alert(1)'), null);
    assert.equal(safePdf('https://example.org/article.pdf'), 'https://example.org/article.pdf');
});

test('confirmed pseudonym selections return the same five publications', () => {
    const real = index.authors.find((a) => a.name === 'Бессарабов Олексій');
    const pseudonym = index.authors.find((a) => a.name === 'Стрілецький Олексій');
    assert.ok(real);
    assert.ok(pseudonym);
    assert.equal(pseudonym.id, 'author_53a41467044d');
    assert.ok(pseudonym.aliases.includes('Стілецький Олексій'));
    const realResults = filterArticles(articles, {
        ...defaults,
        author: real.id,
    });
    const pseudonymResults = filterArticles(articles, {
        ...defaults,
        author: pseudonym.id,
    });
    assert.equal(realResults.length, 5);
    assert.deepEqual(realResults, pseudonymResults);
    assert.equal(realResults.filter((a) => a.authorIds.includes(real.id)).length, 3);
    assert.equal(realResults.filter((a) => a.authorIds.includes(pseudonym.id)).length, 2);
    assert.ok(!index.distinct_people_confirmed_by_owner.some((pair) => pair.includes('Стрілецький Олексій')));
});

test('no-author filter selects missing credits and combines with other filters', () => {
    const found = filterArticles(articles, { ...defaults, author: NO_AUTHOR });
    assert.equal(found.length, 18);
    assert.ok(found.every((a) => a.authorIds.length === 0));
    const language = found[0].language;
    const combined = filterArticles(articles, {
        ...defaults,
        author: NO_AUTHOR,
        language,
    });
    assert.ok(combined.length > 0);
    assert.deepEqual(
        combined,
        found.filter((a) => a.language === language),
    );
    assert.equal(readFilters('?author=no-author').author, NO_AUTHOR);
});

test('issue options use cumulative numbers and issue URLs round-trip', () => {
    const options = issueOptions(articles);
    assert.equal(options.length, 28);
    assert.deepEqual(
        options.slice(-1).map((o) => o.label),
        ['28 (2013)'],
    );
    const filters = readFilters('?issue=2013%3A28');
    const found = filterArticles(articles, filters);
    assert.equal(found.length, 9);
    assert.ok(found.every((a) => a.year === '2013' && a.issueTotal === '28'));
    assert.equal(filterArticles(articles, { ...defaults, issue: '2012:28' }).length, 0);
    assert.ok(filterArticles(articles, readFilters('?year=2013')).every((a) => a.year === '2013'));
    const repeated = issueOptions([
        { year: '2012', issue: '1', issueTotal: '1' },
        { year: '2013', issue: '1', issueTotal: '1' },
    ]);
    assert.equal(repeated.length, 2);
});

test('Ukrainian collation orders Ukrainian letters and author names', () => {
    assert.deepEqual(['Я', 'І', 'Є', 'А', 'Ї', 'Г', 'Ґ', 'Е', 'И'].sort(collator.compare), [
        'А',
        'Г',
        'Ґ',
        'Е',
        'Є',
        'И',
        'І',
        'Ї',
        'Я',
    ]);
    const sorted = [...index.authors].sort((a, b) => collator.compare(a.name, b.name));
    assert.equal(sorted[0].name, 'Аббасли Айсель');
});

test('corrected annual issue is preserved in generated public data', () => {
    const catalog: Catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
    const article = catalog.articles.find((a) => a.title.startsWith('Минная безопасность'));
    assert.ok(article);
    assert.equal(article.issue, '1');
    assert.equal(article.issueTotal, '11');
    assert.equal(article.year, '2009');
    const real = catalog.authors.find((a) => a.name === 'Бессарабов Олексій');
    const pseudonym = catalog.authors.find((a) => a.name === 'Стрілецький Олексій');
    assert.ok(real);
    assert.ok(pseudonym);
    assert.equal(filterArticles(catalog.articles, { ...defaults, author: real.id }).length, 5);
    assert.deepEqual(
        filterArticles(catalog.articles, { ...defaults, author: real.id }),
        filterArticles(catalog.articles, { ...defaults, author: pseudonym.id }),
    );
});

test('expanded and corrected author names preserve aliases and shared URLs', () => {
    const expectedAuthors = [
        ['Борискін Олександр', 'Борискин А.И.', 'author_e6179958a7d8'],
        ['Пятова Анжела', "П'ятова А.В.", 'author_c72d66b11617'],
        ['Івлетшин Дамір', 'Ивлетшин Д.', 'author_cae16c30c889'],
        ['Тейлор Вільям', 'Taylor William B.', 'author_c1326985e529'],
        ['Рассоха Людмила', 'Россоха Людмила', 'author_d7797cfe3706'],
        ['Побле Дмитро', 'Поблє Дмитро', 'author_3399ac5ae365'],
        ['Глебов Сергій', 'Глєбов С.', 'author_419f0fe4645c'],
    ];

    for (const [name, alias, id] of expectedAuthors) {
        const author = index.authors.find((candidate) => candidate.id === id);
        assert.ok(author, `Missing historical author ID: ${id}`);
        assert.equal(author.name, name);
        assert.ok(author.aliases.includes(alias));
        assert.ok(filterArticles(articles, readFilters(`?author=${id}`)).length > 0);
    }

    assert.ok(index.authors.some((author) => author.name === 'Ісмаїлов Т.'));
});

test('clarified multi-author tags resolve to source authors without positional pairing', () => {
    const expectedArticles = [
        {
            title: 'Пути подготовки к защите от террористических актов в Украине',
            authors: ['Захматов Володимир', 'Пятова Анжела', 'Щербак Микола'],
        },
        {
            title: 'The Black Sea Trust: Promoting Civil Society in the Region',
            authors: ['Тейлор Вільям', 'Манрінг Ніколас', 'Ехманн Клер'],
        },
        {
            title: 'Иностранные инвестиции в Азербайджанской Республике (правовые вопросы)',
            authors: ['Мамедов Рустам', 'Аббасли Айсель'],
        },
    ];
    const authorsById = new Map(index.authors.map((author) => [author.id, author.name]));

    for (const expected of expectedArticles) {
        const article = index.articles.find((candidate) => candidate.title === expected.title);
        assert.ok(article);
        assert.deepEqual(
            article.author_ids.map((id) => authorsById.get(id)),
            expected.authors,
        );
        assert.deepEqual(article.unresolved_name_tags, []);
    }
});
