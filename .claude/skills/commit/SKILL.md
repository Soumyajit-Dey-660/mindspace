---
name: "commit"
description: "Stages all changes and commits with a gitmoji commit message."
---

Commit all current changes following these rules:

1. Run `git status` and `git diff` to understand what changed.
2. Stage all relevant changes with `git add`.
3. Write a commit message that:
   - Starts with the appropriate gitmoji from https://gitmoji.dev/ (the actual emoji character, not the `:code:`)
   - Is written in present tense
   - Is short and direct — describes the action, not the why
   - Has no period at the end
   - Examples:
     - ✨ Add playlist generation endpoint
     - 🐛 Fix canvas export returning empty string
     - 🎨 Format codebase with prettier
     - ♻️ Refactor mood analysis prompt
     - 🔧 Update CORS origin config
     - 💄 Style track card hover state

Common gitmoji mappings:
- ✨ new feature
- 🐛 bug fix
- 🎨 format / structure improvement
- ♻️ refactor
- 💄 UI / styles
- 🔧 config change
- 📝 docs
- ✅ tests
- 🚀 deploy / release
- 🔥 remove code or files
- ⚡️ performance
- 🔒️ security
- 🌐 i18n
- 💡 add comments
- 🗃️ database
- 📦️ dependencies

4. Create the commit using the message.
5. Confirm the commit was created successfully.
