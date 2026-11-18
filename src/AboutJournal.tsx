import { useRef } from 'react';
import type { ReactElement } from 'react';

export function AboutJournal(): ReactElement {
    const details = useRef<HTMLDetailsElement>(null);

    function collapse(): void {
        if (details.current) {
            details.current.open = false;
            details.current.querySelector('summary')?.focus();
        }
    }

    return (
        <details className="about-journal" ref={details}>
            <summary>Про часопис</summary>
            <div className="about-journal-content">
                <p>Стаття про історію часопису та призначення електронного архіву готується до публікації.</p>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={collapse}>
                    Згорнути
                </button>
            </div>
        </details>
    );
}
