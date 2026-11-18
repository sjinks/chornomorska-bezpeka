import { Fragment } from 'react';
import type { ReactElement } from 'react';
import type { Article, Author } from './catalog.ts';
import { articleCategories, safePdf } from './search.ts';

interface ArticleCardProps {
    readonly article: Article;
    readonly authorsById: ReadonlyMap<string, Author>;
    readonly onAuthorSelect: (authorId: string) => void;
}

export function ArticleCard({ article, authorsById, onAuthorSelect }: ArticleCardProps): ReactElement {
    const pdfUrl = safePdf(article.pdf);
    const categories = articleCategories(article);
    const hasCumulativeIssue = article.issueTotal && article.issueTotal !== article.issue;
    const issueSuffix = hasCumulativeIssue ? ` (${article.issueTotal})` : '';

    return (
        <article className="article">
            <div className="article-top">
                <span>
                    {article.year} <span className="mx-2">/</span> № {article.issue}
                    {issueSuffix}
                </span>
                <span className="language">{article.language}</span>
            </div>
            <h3>{article.title}</h3>
            <div className="authors">
                {article.authorIds.length ? (
                    article.authorIds.map((authorId, index) => (
                        <Fragment key={authorId}>
                            {index > 0 && <span className="text-secondary"> · </span>}
                            <button className="author-link" onClick={() => onAuthorSelect(authorId)}>
                                {authorsById.get(authorId)?.name}
                            </button>
                        </Fragment>
                    ))
                ) : (
                    <span className="text-secondary">Авторство не зазначено</span>
                )}
            </div>
            <div className="article-bottom">
                <div>
                    {categories.length ? (
                        categories.map((category) => (
                            <span className="category" key={category}>
                                {category}
                            </span>
                        ))
                    ) : (
                        <span className="category">Без рубрики</span>
                    )}
                    {article.page && <span className="page-number">Стор. {article.page}</span>}
                </div>
                {pdfUrl ? (
                    <a href={pdfUrl} className="pdf-link" target="_blank" rel="noreferrer">
                        Відкрити PDF ↗
                    </a>
                ) : (
                    <span className="pdf-pending">PDF ще не додано</span>
                )}
            </div>
        </article>
    );
}
