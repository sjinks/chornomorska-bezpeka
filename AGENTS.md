### Code readability and formatting

- Write source code for human maintainers, not for token efficiency or minimum line count.
- Follow the repository's existing formatting conventions. When absent, use idiomatic, consistently indented formatting.
- Put distinct logical operations on separate lines. Use blank lines to separate logical blocks.
- Do not combine unrelated declarations, assignments, or statements on one line.
- Use braces and explicit control flow when they improve clarity.
- Avoid nested ternaries, compressed callbacks, deeply nested expressions, and excessive inline logic.
- Extract cohesive functions or components when doing so improves readability. Do not introduce abstractions solely to reduce function length.
- Keep rendering code focused on presentation; move nontrivial data processing and state transitions into named functions or hooks.
- Run the repository's formatter and applicable lint checks after editing. Review the formatted result for structural readability.
- Prefer maintainability over brevity. Never minify source code unless explicitly requested.

### Source code readability

- Optimize source code for human readability, not token count.
- Use idiomatic indentation, spacing, and line breaks.
- Separate distinct logical operations with blank lines.
- Never compress unrelated statements onto one line.
- Avoid deeply nested expressions and excessive inline logic.
- Prefer clear control flow over terse expressions.
- Extract functions only when this improves comprehension.
- Apply the repository formatter to modified files.
- Review generated code for readability before completion.
