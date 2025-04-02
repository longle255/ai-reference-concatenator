// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';

import ignore from 'ignore';
import * as vscode from 'vscode';

interface DirectoryNode {
    name: string;
    relativePath: string;
    type: 'directory' | 'file';
    children?: DirectoryNode[];
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('AI Reference Concatenator extension is now active');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand(
        'ai-reference-concatenator.concatSelectedFiles',
        async (clickedResource?: vscode.Uri, selectedResources?: vscode.Uri[]) => {
            // Get selected files - either from context menu or from explorer selection
            let itemsToProcess: vscode.Uri[] = [];

            if (selectedResources && selectedResources.length > 0) {
                // Items selected from context menu
                itemsToProcess = selectedResources;
            } else {
                // Try to get items from the explorer via file explorer API
                const explorerSelection = await getExplorerSelection();
                if (explorerSelection && explorerSelection.length > 0) {
                    itemsToProcess = explorerSelection;
                }

                // If still no items, check current editor (only if it's a file)
                if (!itemsToProcess || itemsToProcess.length === 0) {
                    const currentFileUri = getCurrentEditorUri();
                    if (currentFileUri) {
                        // Ensure we only add files from the editor, not virtual documents etc.
                        try {
                            const stat = await vscode.workspace.fs.stat(currentFileUri);
                            if (stat.type === vscode.FileType.File) {
                                itemsToProcess = [currentFileUri];
                            }
                        } catch (error) {
                            // Ignore error if stat fails (e.g., untitled file)
                            console.log('Could not stat current editor URI:', error);
                        }
                    }
                }
            }

            if (!itemsToProcess || itemsToProcess.length === 0) {
                // Check remains useful in case selection logic changes
                vscode.window.showErrorMessage(
                    'No files or folders selected for concatenation. Please select items in the explorer or have a file open.',
                );
                return;
            }

            // Filter out directories - REMOVED
            // filesToConcat = await filterDirectories(filesToConcat);
            // We now handle directories in concatenateFiles

            if (itemsToProcess.length === 0) {
                // Check remains useful in case selection logic changes
                vscode.window.showErrorMessage(
                    'No valid files or folders selected for concatenation.',
                );
                return;
            }

            // Ask user for the output file name
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open.');
                return;
            }

            const outputFileName = await vscode.window.showInputBox({
                prompt: 'Enter name for the concatenated file',
                value: 'concatenated.txt',
            });

            if (!outputFileName) {
                return; // User cancelled
            }

            try {
                await concatenateFiles(
                    itemsToProcess, // Pass the potentially mixed list
                    path.join(workspaceFolder.uri.fsPath, outputFileName),
                    workspaceFolder.uri.fsPath, // Add workspace path argument
                );
                vscode.window.showInformationMessage(
                    `Files have been concatenated to ${outputFileName}`,
                );

                // Open the newly created file
                const outputFileUri = vscode.Uri.file(
                    path.join(workspaceFolder.uri.fsPath, outputFileName),
                );
                await vscode.window.showTextDocument(outputFileUri);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Error concatenating files: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        },
    );

    const generateStructureDisposable = vscode.commands.registerCommand(
        'ai-reference-concatenator.generateProjectStructure',
        async (clickedResource?: vscode.Uri, selectedResources?: vscode.Uri[]) => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open.');
                return;
            }

            const workspacePath = workspaceFolder.uri.fsPath;
            if (!workspacePath || workspacePath.trim() === '') {
                vscode.window.showErrorMessage('Workspace path is empty or undefined.');
                return;
            }

            // Get selected resources
            let resourcesToProcess: vscode.Uri[] = [];
            if (selectedResources && selectedResources.length > 0) {
                resourcesToProcess = selectedResources;
            } else {
                const explorerSelection = await getExplorerSelection();
                if (explorerSelection && explorerSelection.length > 0) {
                    resourcesToProcess = explorerSelection;
                } else {
                    // If no selection, default to the workspace root
                    resourcesToProcess = [vscode.Uri.file(workspacePath)];
                }
            }

            // Validate resourcesToProcess
            if (
                resourcesToProcess.some(
                    (resource) => !resource.fsPath || resource.fsPath.trim() === '',
                )
            ) {
                vscode.window.showErrorMessage(
                    'One or more selected resources have an empty or invalid path.',
                );
                return;
            }

            const outputFileName = await vscode.window.showInputBox({
                prompt: 'Enter name for the project structure file',
                value: 'project-structure.md',
            });

            if (!outputFileName) {
                return; // User cancelled
            }

            try {
                await generateProjectStructure(
                    resourcesToProcess,
                    workspacePath,
                    path.join(workspacePath, outputFileName),
                );
                vscode.window.showInformationMessage(
                    `Project structure has been generated to ${outputFileName}`,
                );

                // Open the newly created file
                const outputFileUri = vscode.Uri.file(path.join(workspacePath, outputFileName));
                await vscode.window.showTextDocument(outputFileUri);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Error generating project structure: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        },
    );

    context.subscriptions.push(disposable);
    context.subscriptions.push(generateStructureDisposable);
}

/**
 * Get the URI from the currently active editor
 */
function getCurrentEditorUri(): vscode.Uri | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        return activeEditor.document.uri;
    }

    // Check active tab if no active editor
    const activeTabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    if (activeTabInput && typeof activeTabInput === 'object' && 'uri' in activeTabInput) {
        return activeTabInput.uri as vscode.Uri;
    }

    return undefined;
}

/**
 * Try to get the selected files from the explorer
 */
async function getExplorerSelection(): Promise<vscode.Uri[] | undefined> {
    // There's no direct API for getting explorer selection, but we can use a command
    // This is not an official API and may break in future versions
    try {
        // Use the reveal in explorer command which works with selected file
        const uris = await vscode.commands.executeCommand<vscode.Uri[]>(
            'workbench.files.action.getFilesOfActiveFileExplorer',
        );
        if (uris && uris.length > 0) {
            return uris;
        }
    } catch (error) {
        console.log('Failed to get explorer selection:', error);
    }

    return undefined;
}

async function concatenateFiles(
    itemUris: vscode.Uri[],
    outputPath: string,
    workspacePath: string,
): Promise<void> {
    let concatenatedContent = '';
    const allFileUris: vscode.Uri[] = [];
    const uniqueFilePaths = new Set<string>();

    // Get the ignore processor
    const ig = await getAirefignoreProcessor(workspacePath);

    // Phase 1: Collect all file URIs, expanding directories
    const itemsToProcessStack = [...itemUris]; // Use a stack for iterative processing
    while (itemsToProcessStack.length > 0) {
        const currentUri = itemsToProcessStack.pop();
        if (!currentUri || !currentUri.fsPath) continue;

        // Check if the item itself should be ignored BEFORE stating
        if (shouldIgnoreFile(currentUri.fsPath, workspacePath, ig)) {
            continue;
        }

        try {
            // eslint-disable-next-line no-await-in-loop
            const stat = await vscode.workspace.fs.stat(currentUri);
            if (stat.type === vscode.FileType.File) {
                // Check again (redundant but safe if logic changes) and ensure uniqueness
                if (
                    !uniqueFilePaths.has(currentUri.fsPath) &&
                    !shouldIgnoreFile(currentUri.fsPath, workspacePath, ig)
                ) {
                    allFileUris.push(currentUri);
                    uniqueFilePaths.add(currentUri.fsPath);
                }
            } else if (stat.type === vscode.FileType.Directory) {
                // Read directory contents and add children to the stack
                // eslint-disable-next-line no-await-in-loop
                const entries = await vscode.workspace.fs.readDirectory(currentUri);
                for (const [name] of entries) {
                    // Don't need type here yet
                    const entryUri = vscode.Uri.joinPath(currentUri, name);
                    // Add to stack for processing, ignore check will happen when it's popped
                    itemsToProcessStack.push(entryUri);
                }
            }
        } catch (error) {
            vscode.window.showWarningMessage(
                `Error processing ${currentUri.fsPath}: ${error instanceof Error ? error.message : String(error)}`,
            );
            console.error(`Error processing ${currentUri.fsPath}:`, error);
        }
    }

    // Optional: Sort files for deterministic output order
    allFileUris.sort((a, b) => a.fsPath.localeCompare(b.fsPath));

    // Phase 2: Read and concatenate files
    for (const fileUri of allFileUris) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const content = await vscode.workspace.fs.readFile(fileUri);
            const textDecoder = new TextDecoder();
            const fileContent = textDecoder.decode(content);
            const relativePath = path.relative(workspacePath, fileUri.fsPath);
            concatenatedContent += `\n/* ---- File: ${relativePath.replaceAll('\\', '/')} ---- */\n\n`;
            concatenatedContent += fileContent;
            concatenatedContent += '\n\n';
        } catch (error) {
            vscode.window.showWarningMessage(
                `Skipping file ${fileUri.fsPath} due to read error: ${error instanceof Error ? error.message : String(error)}`,
            );
            console.error(`Failed to read file ${fileUri.fsPath}:`, error);
        }
    }

    // Write the concatenated content to the output file
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(outputPath),
        encoder.encode(concatenatedContent),
    );
}

/**
 * Generates a project structure markdown file for selected resources.
 *
 * @param selectedResources The selected files/directories.
 * @param workspacePath The path to the workspace root.
 * @param outputPath The path where the structure file will be saved.
 */
async function generateProjectStructure(
    selectedResources: vscode.Uri[],
    workspacePath: string,
    outputPath: string,
): Promise<void> {
    console.log('Selected Resources:', selectedResources);
    console.log('Workspace Path:', workspacePath);

    if (!workspacePath || workspacePath.trim() === '') {
        throw new Error('Workspace path is empty or undefined.');
    }

    if (!selectedResources || selectedResources.length === 0) {
        throw new Error('No resources selected for project structure generation.');
    }

    const ig = await getAirefignoreProcessor(workspacePath);

    // Process resources concurrently
    const structurePromises = selectedResources.map((resource) => {
        if (!resource.fsPath || resource.fsPath.trim() === '') {
            console.error('Invalid or empty resource path:', resource);
            return Promise.resolve(null); // Resolve with null for invalid paths
        }
        console.log('Processing resource:', resource.fsPath);
        return buildDirectoryTree(resource.fsPath, workspacePath, ig);
    });

    const structureNodes = await Promise.all(structurePromises);

    // Filter out null results from invalid paths or ignored items
    const filteredStructure = structureNodes.filter((node): node is DirectoryNode => node !== null);

    const markdown = filteredStructure.map((node) => convertTreeToMarkdown(node)).join('\n');
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPath), encoder.encode(markdown));
}

/**
 * Recursively builds a directory tree, respecting .airefignore.
 *
 * @param entryPath The path of the file or directory to process.
 * @param workspacePath The root workspace path for relative paths.
 * @param ig The ignore instance.
 * @returns A tree structure representing the directory or file, or null if ignored.
 */
async function buildDirectoryTree(
    entryPath: string,
    workspacePath: string,
    ig: ignore.Ignore,
): Promise<DirectoryNode | null> {
    if (!entryPath || entryPath.trim() === '') {
        console.error('Empty or invalid entryPath received in buildDirectoryTree:', entryPath);
        return null;
    }

    // Ensure we have a reliable absolute path
    const absoluteEntryPath = path.isAbsolute(entryPath)
        ? entryPath
        : path.resolve(workspacePath, entryPath);

    // Special case for workspace root
    const isWorkspaceRoot = absoluteEntryPath === workspacePath;

    // Check if we should ignore this path (but skip the check for workspace root)
    if (!isWorkspaceRoot && shouldIgnoreFile(absoluteEntryPath, workspacePath, ig)) {
        return null;
    }

    const entryUri = vscode.Uri.file(absoluteEntryPath);

    try {
        const stat = await vscode.workspace.fs.stat(entryUri);

        // For workspace root, use a special relative path to avoid issues with empty strings
        const nodeRelativePath = isWorkspaceRoot
            ? '/'
            : path.relative(workspacePath, absoluteEntryPath).replaceAll('\\', '/');

        if (stat.type === vscode.FileType.Directory) {
            const node: DirectoryNode = {
                name: path.basename(absoluteEntryPath) || path.basename(workspacePath),
                relativePath: nodeRelativePath,
                type: 'directory',
                children: [],
            };

            const entries = await vscode.workspace.fs.readDirectory(entryUri);
            const childPromises: Array<Promise<DirectoryNode | null>> = [];

            for (const [name] of entries) {
                const childPath = path.join(absoluteEntryPath, name);

                // Skip directories that match ignore patterns
                if (shouldIgnoreFile(childPath, workspacePath, ig)) {
                    continue;
                }

                childPromises.push(buildDirectoryTree(childPath, workspacePath, ig));
            }

            const childResults = await Promise.all(childPromises);

            for (const childNode of childResults) {
                if (childNode && node.children) {
                    node.children.push(childNode);
                }
            }

            if (node.children) {
                node.children.sort((a, b) => a.name.localeCompare(b.name));
            }

            return node;
        } else if (stat.type === vscode.FileType.File) {
            return {
                name: path.basename(absoluteEntryPath),
                relativePath: nodeRelativePath,
                type: 'file',
            };
        }
    } catch (error) {
        console.error(`Error processing ${absoluteEntryPath}:`, error);
        return null;
    }

    return null;
}

/**
 * Reads and parses .airefignore patterns using the 'ignore' library.
 *
 * @param workspacePath The path to the workspace root.
 * @returns An initialized ignore instance.
 */
async function getAirefignoreProcessor(workspacePath: string): Promise<ignore.Ignore> {
    const ig = ignore();
    const airefignorePath = path.join(workspacePath, '.airefignore');
    try {
        const airefignoreContent = await vscode.workspace.fs.readFile(
            vscode.Uri.file(airefignorePath),
        );
        const textDecoder = new TextDecoder();
        const contentString = textDecoder.decode(airefignoreContent);
        ig.add(contentString); // Add patterns directly from the file content
        console.log('Initialized ignore processor with .airefignore patterns.');
    } catch (error) {
        console.log('No .airefignore file found or error reading it:', error);
        // If no ignore file, the 'ig' instance will be empty and ignore nothing
    }
    return ig;
}

/**
 * Checks if a file or directory should be ignored based on .airefignore patterns.
 *
 * @param filePath The path of the file or directory.
 * @param workspacePath The root workspace path for relative paths.
 * @param ig The ignore instance.
 * @returns True if the file/directory should be ignored, false otherwise.
 */
function shouldIgnoreFile(filePath: string, workspacePath: string, ig: ignore.Ignore): boolean {
    if (!filePath || !workspacePath) {
        console.error('Invalid filePath or workspacePath:', { filePath, workspacePath });
        return true; // Treat invalid paths as ignored to prevent errors
    }

    // Check if we're dealing with the workspace root
    // In which case, we handle it specially to avoid issues with path.relative() resulting in an empty string
    if (filePath === workspacePath) {
        // Don't ignore workspace root - this is a special case
        console.log('Workspace root detected, skipping ignore check for:', filePath);
        return false;
    }

    // Handle normal relative paths - not the root workspace
    const relativePath = path.relative(workspacePath, filePath);

    if (!relativePath) {
        console.warn(
            `Empty relative path detected for filePath '${filePath}' relative to '${workspacePath}'`,
        );
        return false; // Don't ignore empty paths
    }

    // Normalize for ignore library (use forward slashes)
    const normalizedPath = relativePath.replaceAll('\\', '/');

    console.log(`Checking ignore for normalized path: '${normalizedPath}'`);

    const isIgnored = ig.ignores(normalizedPath);

    if (isIgnored) {
        console.log(`Path ignored by ignore library: '${normalizedPath}'`);
    }
    return isIgnored;
}

/**
 * Converts a directory tree to markdown format.
 *
 * @param node The root node of the directory tree.
 * @param level The current indentation level.
 * @returns A markdown string representing the directory structure.
 */
function convertTreeToMarkdown(node: DirectoryNode, level: number = 0): string {
    // Handle root node display
    const isRoot = node.relativePath === '/' || node.relativePath === '.';
    const prefix = level === 0 && isRoot ? '' : '  '.repeat(level);
    const connector = level === 0 && isRoot ? '' : '├── ';

    let markdown = `${prefix}${connector}${node.name}${node.type === 'directory' ? '/' : ''}\n`;

    if (node.children) {
        node.children.forEach((child) => {
            markdown += convertTreeToMarkdown(child, level + 1);
        });
    }

    return markdown;
}

// This method is called when your extension is deactivated
export function deactivate() {}
