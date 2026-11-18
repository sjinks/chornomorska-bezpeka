import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Catalog } from '../src/catalog.ts';
import { IssueGallery } from '../src/IssueGallery.tsx';
import { issueOptions } from '../src/search.ts';

const catalog: Catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
const issues = issueOptions(catalog.articles);

interface GalleryButtonProps {
    'aria-label': string;
    'aria-pressed': boolean;
    onClick: () => void;
    children?: ReactNode;
}

function galleryButtons(node: ReactNode): ReactElement<GalleryButtonProps>[] {
    if (!isValidElement<{ children?: ReactNode }>(node)) {
        return [];
    }

    const descendants = Children.toArray(node.props.children).flatMap(galleryButtons);
    if (node.type === 'button' && isValidElement<GalleryButtonProps>(node)) {
        return [node, ...descendants];
    }
    return descendants;
}

test('each catalogue issue has an optimized static WebP cover', () => {
    const directory = new URL('../public/covers/', import.meta.url);
    const expectedFiles = issues.map((issue) => `${issue.number.padStart(2, '0')}.webp`);
    assert.deepEqual(readdirSync(directory).sort(), expectedFiles.sort());

    for (const filename of expectedFiles) {
        const image = readFileSync(new URL(filename, directory));
        assert.equal(image.toString('ascii', 0, 4), 'RIFF', filename);
        assert.equal(image.toString('ascii', 8, 12), 'WEBP', filename);
    }
});

test('gallery exposes all issues, reflects the selected issue, and selects by issue/year', () => {
    let selected = '';
    const gallery = IssueGallery({
        issues,
        selectedIssue: '2013:28',
        onSelect: (issueValue) => {
            selected = issueValue;
        },
    });
    const buttons = galleryButtons(gallery);
    assert.equal(buttons.length, issues.length);
    assert.equal(buttons.filter((button) => button.props['aria-pressed']).length, 1);

    const lastButton = buttons.at(-1);
    assert.ok(lastButton);
    assert.equal(lastButton.props['aria-label'], 'Показати публікації номера 28 (2013)');
    assert.ok(lastButton.props['aria-pressed']);
    lastButton.props.onClick();
    assert.equal(selected, '2013:28');

    const firstButton = buttons[0];
    assert.ok(firstButton);
    firstButton.props.onClick();
    assert.equal(selected, '2005:1');
});
