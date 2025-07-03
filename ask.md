# How to Automatically Generate Commit Messages Based on Code Changes

Automatically generating commit messages based on actual code changes is a modern workflow improvement. Here are the most effective ways to do this:

---

## 1. Use `git diff` with AI (Recommended)
You can use AI tools (like OpenAI's GPT, Copilot CLI, or other LLMs) to summarize your staged changes and generate a commit message. There are CLI tools that do this for you:

### a. [OpenCommit](https://github.com/di-sukharev/opencommit)
OpenCommit uses OpenAI/GPT to generate meaningful commit messages from your staged changes.

**Install:**
```bash
npm install -g opencommit
```

**Usage:**
```bash
git add .
opencommit
```
- It will analyze your staged changes and suggest a commit message.
- You can accept or edit the message before committing.

---

### b. [aicommits](https://github.com/Nutlope/aicommits)
Another tool that uses AI to generate commit messages.

**Install:**
```bash
npm install -g aicommits
```

**Usage:**
```bash
git add .
aicommits
```
- It will prompt you for an OpenAI API key the first time.
- It generates a commit message based on your code diff.

---

## 2. GitHub Copilot CLI (If you have access)
If you have GitHub Copilot, you can use the Copilot CLI to generate commit messages:

**Install:**
```bash
npm install -g @githubnext/copilot-cli
```

**Usage:**
```bash
git add .
gh copilot commit
```

---

## 3. Conventional Commits with `commitizen` (Semi-automatic)
If you want structured commit messages, you can use [commitizen](https://github.com/commitizen/cz-cli):

**Install:**
```bash
npm install -g commitizen
```

**Usage:**
```bash
git add .
cz commit
```
- It will ask you questions about your changes and generate a message.

---

## 4. Scripted Approach (Basic, No AI)
You can use a script to summarize the output of `git diff --stat` or `git diff --cached` and use that as a commit message, but this is less descriptive than AI-based solutions.

---

## 5. Integrate with Your Workflow
You can update your `quick-push.js` or `git-workflow.sh` to call one of these tools (like `opencommit` or `aicommits`) instead of asking for a manual message.

---

## Summary Table

| Tool         | AI-based | Structured | Easy to Use | Customizable |
|--------------|----------|------------|-------------|--------------|
| opencommit   | ✅       | ❌         | ✅          | ✅           |
| aicommits    | ✅       | ❌         | ✅          | ✅           |
| copilot-cli  | ✅       | ❌         | ✅          | ✅           |
| commitizen   | ❌       | ✅         | ✅          | ✅           |
| custom script| ❌       | ❌         | ✅          | ✅           |

---

**Recommendation:**
For the best results, try `opencommit` or `aicommits` for AI-generated commit messages.
If you want, you can integrate one of these tools into your workflow or scripts for even more automation. 