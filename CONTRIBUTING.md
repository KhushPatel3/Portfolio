# Contributing and Development Guidelines

## 1. General principles

- Preserve existing working functionality.
- Do not remove features without an explicit reason and approval.
- Make focused changes rather than rewriting entire files unnecessarily.
- Keep frontend, backend and documentation responsibilities separate.
- Prioritise data accuracy and reliability over visual enhancements.
- Do not introduce paid services or subscriptions without approval.
- Do not commit credentials, API keys, private URLs or sensitive personal data.

## 2. Project structure

- `frontend/`: Website structure, styling and browser-side logic.
- `apps-script/`: Google Apps Script backend and data processing.
- `docs/`: Technical documentation and architecture.
- `README.md`: Project overview and setup.
- `CHANGELOG.md`: Completed changes by version.
- `ROADMAP.md`: Planned development milestones.

## 3. Development workflow

For each feature or bug fix:

1. Identify the problem or requirement.
2. Check the existing implementation before changing anything.
3. Identify affected files and dependencies.
4. Implement the smallest appropriate change.
5. Check that existing functionality still works.
6. Test the new functionality.
7. Update documentation where necessary.
8. Commit the completed change.

## 4. Commit message convention

Use:

`type: short description`

Accepted types:

- `feat`: New feature.
- `fix`: Bug fix.
- `refactor`: Internal code restructuring.
- `docs`: Documentation.
- `style`: Formatting or styling.
- `test`: Tests.
- `chore`: Maintenance and configuration.

Commit messages should:
- Be concise and specific.
- Describe the actual change.
- Use the imperative form where practical.
- Avoid vague messages such as `update`, `changes` or `final version`.

## 5. Version management

- Use Semantic Versioning principles.
- Use `0.x.x` during initial development.
- Update `CHANGELOG.md` when a meaningful change is completed.
- Update `ROADMAP.md` when priorities or milestone scope change.
- Create Git tags for meaningful releases, not every commit.
- Reserve `1.0.0` for the first stable release.

## 6. Testing and data integrity

- Verify calculations against the authoritative Google Sheets data.
- Do not silently replace missing live data with sample data.
- Clearly distinguish real data, placeholder data and unavailable data.
- Check error handling for failed API requests.
- Avoid modifying or deleting existing spreadsheet data unless explicitly required.

## 7. Documentation

Keep documentation consistent with the actual implementation.

- Completed functionality belongs in `CHANGELOG.md`.
- Future functionality belongs in `ROADMAP.md`.
- Technical design decisions belong in `docs/ARCHITECTURE.md`.
- Setup and usage instructions belong in `README.md`.