// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';

import * as vscode from 'vscode';

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

    context.subscriptions.push(disposable);
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

/**
 * Recursively finds all files within a given directory URI.
 *
 * @param dirUri The URI of the directory to search.
 * @returns A promise that resolves to an array of file URIs.
 */
async function findFilesInDirectoryRecursive(dirUri: vscode.Uri): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    try {
        const entries = await vscode.workspace.fs.readDirectory(dirUri);
        for (const [name, type] of entries) {
            const entryUri = vscode.Uri.joinPath(dirUri, name);
            if (type === vscode.FileType.Directory) {
                // eslint-disable-next-line no-await-in-loop
                files.push(...(await findFilesInDirectoryRecursive(entryUri)));
            } else if (type === vscode.FileType.File) {
                files.push(entryUri);
            }
        }
    } catch (error) {
        // Log error but continue processing other directories/files
        vscode.window.showWarningMessage(
            `Error reading directory ${dirUri.fsPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
        console.error(`Error reading directory ${dirUri.fsPath}:`, error);
    }
    return files;
}

async function concatenateFiles(
    itemUris: vscode.Uri[],
    outputPath: string,
    workspacePath: string, // Add parameter for workspace path
): Promise<void> {
    let concatenatedContent = '';
    const allFileUris: vscode.Uri[] = [];
    const uniqueFilePaths = new Set<string>(); // To avoid duplicates

    // Phase 1: Collect all file URIs, expanding directories
    for (const itemUri of itemUris) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const stat = await vscode.workspace.fs.stat(itemUri);
            if (stat.type === vscode.FileType.File) {
                if (!uniqueFilePaths.has(itemUri.fsPath)) {
                    allFileUris.push(itemUri);
                    uniqueFilePaths.add(itemUri.fsPath);
                }
            } else if (stat.type === vscode.FileType.Directory) {
                // eslint-disable-next-line no-await-in-loop
                const filesInDir = await findFilesInDirectoryRecursive(itemUri);
                for (const fileUri of filesInDir) {
                    if (!uniqueFilePaths.has(fileUri.fsPath)) {
                        allFileUris.push(fileUri);
                        uniqueFilePaths.add(fileUri.fsPath);
                    }
                }
            }
        } catch (error) {
            vscode.window.showWarningMessage(
                `Error processing ${itemUri.fsPath}: ${error instanceof Error ? error.message : String(error)}`,
            );
            console.error(`Error processing ${itemUri.fsPath}:`, error);
            // Continue processing other items
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

            // Calculate relative path
            const relativePath = path.relative(workspacePath, fileUri.fsPath);

            // Add relative file path as a header before its content
            concatenatedContent += `\n/* ---- File: ${relativePath.replaceAll('\\', '/')} ---- */\n\n`;
            concatenatedContent += fileContent;
            concatenatedContent += '\n\n';
        } catch (error) {
            // Consider making this non-fatal or providing more context
            vscode.window.showWarningMessage(
                `Skipping file ${fileUri.fsPath} due to read error: ${error instanceof Error ? error.message : String(error)}`,
            );
            console.error(`Failed to read file ${fileUri.fsPath}:`, error);
            // Decide if you want to throw or continue
            // throw new Error( ... ); // If one error should stop everything
            // continue; // If you want to skip the problematic file
        }
    }

    // Write the concatenated content to the output file
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(outputPath),
        encoder.encode(concatenatedContent),
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
