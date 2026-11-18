import type { ReactElement } from 'react';
import type { IssueOption } from './search.ts';

interface IssueCoverProps {
    readonly issue: IssueOption;
}

export function IssueCover({ issue }: IssueCoverProps): ReactElement {
    const filename = `${issue.number.padStart(2, '0')}.webp`;
    const source = `${import.meta.env.BASE_URL}covers/${filename}`;

    return (
        <img
            className="issue-cover"
            src={source}
            alt={`Обкладинка часопису, номер ${issue.label}`}
            width={480}
            height={720}
            loading="lazy"
            decoding="async"
        />
    );
}
