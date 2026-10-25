# Contributing to NewRssFeed

First of all, thank you for your interest in contributing to **NewRssFeed**!

NewRssFeed is an open-source RSS reader designed to bring the content you follow into one place. Contributions of all kinds are welcome, including bug reports, feature suggestions, documentation improvements, and code changes.

## Table of Contents

- [Getting Started](#getting-started)
- [Ways to Contribute](#ways-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Workflow](#development-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Code Guidelines](#code-guidelines)
- [Community Guidelines](#community-guidelines)
- [License](#license)

## Getting Started

Before contributing, familiarize yourself with the project and its existing code.

1. Read the [README](README.md) to understand the project and its features.
2. Browse the repository to understand its structure and implementation.
3. Check existing [issues](https://github.com/korayozkan/NewRssFeed/issues) and [pull requests](https://github.com/korayozkan/NewRssFeed/pulls) to avoid duplicating existing work.

### Setting Up Your Environment

Fork the repository and clone your fork:

```bash
git clone https://github.com/YOUR-USERNAME/NewRssFeed.git
cd NewRssFeed
```

Replace `YOUR-USERNAME` with your GitHub username.

Follow the setup instructions in the README to run the project locally. Before making changes, verify that the existing application works in your environment.

## Ways to Contribute

There are several ways to help improve NewRssFeed:

- **Bug fixes:** Identify and fix existing issues.
- **Features:** Propose and implement useful improvements.
- **Documentation:** Improve the README, guides, and explanations.
- **UI/UX:** Improve usability, accessibility, and responsive layouts.
- **Testing:** Help identify regressions and verify expected behavior.
- **Feedback:** Share ideas and report problems through GitHub Issues.

Contributions do not have to involve writing code.

## Reporting Bugs

If you discover a bug, please [open an issue](https://github.com/korayozkan/NewRssFeed/issues/new) and include as much relevant information as possible.

A useful bug report should include:

- **Summary:** A clear and concise description of the problem.
- **Steps to reproduce:** Instructions for reproducing the issue.
- **Expected behavior:** What you expected to happen.
- **Actual behavior:** What happened instead.
- **Environment:** Browser, operating system, and other relevant details.
- **Screenshots or logs:** Include them when they help explain the issue.

Before opening an issue, check whether the problem has already been reported.

## Suggesting Features

Feature suggestions are welcome when they improve the reading experience or align with the project's goals.

When proposing a feature, explain:

- The problem it solves.
- Why it would be useful to users.
- How you imagine it working.
- Any relevant examples, mockups, or references.

Please open an issue to discuss substantial changes before investing time in implementation. This helps ensure that the proposed feature fits the project's direction.

## Development Workflow

For code contributions, use the following workflow:

1. **Fork** the repository on GitHub.
2. **Create a branch** for your changes.
3. **Make focused changes** that address one issue or feature.
4. **Test your changes** in the relevant environment.
5. **Review your diff** for accidental changes, debugging code, and formatting problems.
6. **Commit your changes** with a clear, descriptive message.
7. **Push your branch** to your fork.
8. **Open a pull request** against the original repository's `main` branch.

Example branch names:

```text
fix/feed-loading
feat/reading-preferences
docs/update-readme
```

Example commit messages:

```text
fix: handle invalid feed responses
feat: improve feed organization
docs: clarify setup instructions
```

These examples are conventions, not strict requirements.

## Pull Request Guidelines

Before submitting a pull request, make sure that:

- [ ] The changes address a specific issue or clearly explained improvement.
- [ ] The implementation follows the existing project structure and conventions.
- [ ] The application works as expected after the changes.
- [ ] Relevant tests or manual checks have been performed.
- [ ] Documentation has been updated when necessary.
- [ ] No unrelated changes, secrets, credentials, or personal information are included.
- [ ] The pull request description explains what changed and why.

### Writing a Good Pull Request Description

Please include:

- **Purpose:** What problem does this pull request solve?
- **Changes:** What did you modify?
- **Testing:** How did you verify the changes?
- **Related issues:** Link relevant issues using GitHub references, such as `Closes #12`.

Keep pull requests focused and reasonably small where possible. If a proposed change is substantial, discuss it with the maintainer before implementing it.

Pull requests may receive feedback or require revisions before they can be merged.

## Code Guidelines

To keep NewRssFeed maintainable:

- Follow the conventions already used in the relevant files.
- Prefer simple, readable, and maintainable solutions.
- Use descriptive names for variables, functions, and other identifiers.
- Avoid unnecessary dependencies.
- Keep changes focused and avoid unrelated refactoring.
- Preserve existing functionality unless a change is intentional.
- Consider responsive design and accessibility when modifying the interface.
- Handle errors gracefully and avoid exposing sensitive information.
- Update documentation when behavior or setup instructions change.

Do not introduce a new framework, dependency, or major architectural change without discussing it first.

## Community Guidelines

We want NewRssFeed to be a welcoming and constructive open-source project.

All contributors are expected to:

- Be respectful and considerate.
- Provide constructive feedback.
- Accept differing opinions and reasonable criticism.
- Focus discussions on ideas, code, and solutions.
- Avoid harassment, discrimination, and personal attacks.

Disagreements should be handled professionally and respectfully.

## Security Issues

Please do not disclose sensitive security vulnerabilities in public issues.

Report security concerns privately to the repository maintainer through an appropriate private contact channel. Include enough information to understand and reproduce the issue without unnecessarily exposing users to risk.

## License

By contributing to NewRssFeed, you agree that your contributions will be distributed under the project's [MIT License](LICENSE.md).

Please ensure that you have the right to submit any code, assets, or other material included in your contribution.

## Thank You

Every useful contribution helps make NewRssFeed better.

Thank you for taking the time to contribute!

**Repository:** [korayozkan/NewRssFeed](https://github.com/korayozkan/NewRssFeed)

**Issues:** [Report a bug or suggest an improvement](https://github.com/korayozkan/NewRssFeed/issues)

**Pull Requests:** [View proposed changes](https://github.com/korayozkan/NewRssFeed/pulls)
