import type { ReactElement } from 'react';
import { IssueCover } from './IssueCover.tsx';
import type { IssueOption } from './search.ts';

interface IssueGalleryProps {
    readonly issues: readonly IssueOption[];
    readonly selectedIssue: string;
    readonly onSelect: (issueValue: string) => void;
}

export function IssueGallery({ issues, selectedIssue, onSelect }: IssueGalleryProps): ReactElement {
    return (
        <section className="issue-gallery" aria-labelledby="issues-title">
            <h2 id="issues-title" className="h4">
                Номери часопису
            </h2>
            <p className="help">
                Виберіть обкладинку, щоб переглянути публікації номера. Гортайте, щоб побачити всі номери.
            </p>
            <ul className="issue-gallery-list">
                {issues.map((issue) => (
                    <li key={issue.value}>
                        <button
                            className="issue-gallery-button"
                            type="button"
                            aria-label={`Показати публікації номера ${issue.label}`}
                            aria-pressed={selectedIssue === issue.value}
                            onClick={() => onSelect(issue.value)}
                        >
                            <IssueCover issue={issue} />
                            <span>№ {issue.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
