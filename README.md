# AI Reference Concatenator

<div align="center">

<!-- TODO: Replace these badges with actual links once published -->
<!-- [![Version](https://img.shields.io/visual-studio-marketplace/v/longle.ai-reference-concatenator)](https://marketplace.visualstudio.com/items/longle.ai-reference-concatenator/changelog) -->
<!-- [![Installs](https://img.shields.io/visual-studio-marketplace/i/longle.ai-reference-concatenator)](https://marketplace.visualstudio.com/items?itemName=longle.ai-reference-concatenator) -->
<!-- [![Downloads](https://img.shields.io/visual-studio-marketplace/d/longle.ai-reference-concatenator)](https://marketplace.visualstudio.com/items?itemName=longle.ai-reference-concatenator) -->
<!-- [![Rating Star](https://img.shields.io/visual-studio-marketplace/stars/longle.ai-reference-concatenator)](https://marketplace.visualstudio.com/items?itemName=longle.ai-reference-concatenator&ssr=false#review-details) -->

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://github.com/longle255/ai-reference-concatenator/pulls)
[![Github Open Issues](https://img.shields.io/github/issues/longle255/ai-reference-concatenator)](https://github.com/longle255/ai-reference-concatenator/issues)
[![License](https://img.shields.io/github/license/longle255/ai-reference-concatenator)](./LICENSE)

</div>

AI Reference Concatenator is a Visual Studio Code extension designed to transform your project files into a single, AI-ready reference document. By merging selected files and folders into one comprehensive output file—with clear, relative path headers—it becomes a powerful resource for providing context to AI systems for code analysis, documentation generation, and other advanced tasks.

## Features

- **Merge Multiple Files:** Select and combine multiple files from the explorer into one output document.
- **Recursive Folder Concatenation:** Select one or more folders; the extension will recursively merge all contained files.
- **Project Structure Generation:** Generate a markdown file showing the tree structure of your project, respecting `.airefignore` patterns.
- **Mixed Selection Support:** Works with a combination of files and folders.
- **Relative Path Headers:** Each file's content is prefixed with a header showing its path relative to the workspace root.
- **Custom Output File Name:** Provides an option to specify the name of the output file (default is `concatenated.txt` for concatenation, `project-structure.md` for structure generation).
- **Context Menu Integration:** Easily access the commands via the explorer context menu:
  - Visible when selecting multiple files, one or more folders, or mixed selection.
  - Hidden when only a single file is selected.
- **Automatic Output Opening:** Automatically opens the generated file after processing.
- **Optimized for AI:** The structured output file is ideal for supplying to AI systems as reference material, ensuring context is maintained for tasks like code analysis or generating accurate documentation.
- **Ignore Patterns:** Supports `.airefignore` file to exclude specific files and directories from processing.

## Usage

### File Concatenation

1. **Select Files/Folders:** In the VS Code Explorer, select the files and/or folders you want to concatenate.
2. **Right-Click:** Right-click on one of the selected items.
3. **Choose Command:** Select "Concat Selected Files" from the context menu.
4. **Enter Output Name:** An input box will appear. Enter the desired name for the output file (e.g., `bundle.js`, `combined_log.txt`) and press Enter.
5. **Review:** The extension creates the output file in your workspace root, complete with relative path headers for each file, and opens it for your review.

### Project Structure Generation

1. **Select Files/Folders:** In the VS Code Explorer, select the files and/or folders you want to include in the structure. If nothing is selected, it will default to the workspace root.
2. **Right-Click:** Right-click on one of the selected items.
3. **Choose Command:** Select "Generate Project Structure" from the context menu.
4. **Enter Output Name:** An input box will appear. Enter the desired name for the structure file (default is `project-structure.md`) and press Enter.
5. **Review:** The extension creates a markdown file showing the tree structure of your project, respecting `.airefignore` patterns, and opens it for your review.

![Demo GIF (Placeholder - replace with actual demo)](https://via.placeholder.com/600x300.png?text=AI+Reference+Concatenator+Demo)
_(Replace the above placeholder with a GIF showing the extension in action)_

## Installation

### From Marketplace (Coming Soon!)

Once published, install the extension directly from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/).

1. Open VS Code.
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).
3. Search for `AI Reference Concatenator` or `longle.ai-reference-concatenator`.
4. Click "Install".

### From Source (for Development/Testing)

1. Clone the repository:
   ```bash
   git clone https://github.com/longle255/ai-reference-concatenator.git
   ```
2. Navigate into the directory:
   ```bash
   cd ai-reference-concatenator
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Open the project in VS Code:
   ```bash
   code .
   ```
5. Press `F5` to launch a new Extension Development Host window with the extension loaded.

## Development

Follow the steps mentioned in the [From Source](#from-source-for-developmenttesting) section above.

- **Build:** Use `pnpm run compile` or `pnpm run watch` for incremental builds.
- **Lint:** Run `pnpm run lint`
- **Run Tests:** Execute `pnpm run test` (tests might need to be set up).
- **Package:** Use `pnpm vsce package` (ensure `vsce` is installed globally via `npm install -g @vscode/vsce`)

## Contributing

Contributions, issues, and feature requests are welcome! Please check the [issues page](https://github.com/longle255/ai-reference-concatenator/issues) before submitting a new issue.

When contributing, please adhere to the existing coding style and run the linting script (`pnpm run lint`) before submitting a pull request.

## License

Distributed under the license specified in the [LICENSE](./LICENSE) file.

---

Developed by [Long Le](https://github.com/longle255).

## Credits

[VSCode Extension ](https://github.com/tjx666/awesome-vscode-extension-boilerplate)
