import * as vscode from 'vscode';
import { renumber, countByType } from './renumber';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Auto-number Requirements');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'auto-number-requirements.numberRequirements';
    context.subscriptions.push(statusBarItem);

    const updateStatusBar = (editor?: vscode.TextEditor) => {
        if (!editor) { statusBarItem.hide(); return; }
        const config = vscode.workspace.getConfiguration('auto-number-requirements');
        const types = config.get<string[]>('requirementTypes', ['FR', 'NFR']);
        const lines = Array.from({ length: editor.document.lineCount }, (_, i) => ({
            text: editor.document.lineAt(i).text
        }));
        const counts = countByType(lines, types);
        const parts = Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${t}:${n}`);
        if (parts.length === 0) { statusBarItem.hide(); return; }
        statusBarItem.text = `$(list-ordered) ${parts.join(' ')}`;
        statusBarItem.tooltip = 'Auto-number Requirements — нажмите для нумерации';
        statusBarItem.show();
    };

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (vscode.window.activeTextEditor?.document === e.document) {
                updateStatusBar(vscode.window.activeTextEditor);
            }
        })
    );
    updateStatusBar(vscode.window.activeTextEditor);

    const commandId = 'auto-number-requirements.numberRequirements';
    const disposable = vscode.commands.registerCommand(commandId, async () => {
        outputChannel.appendLine('--- Запуск команды ---');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Нет активного редактора.');
            return;
        }

        const document = editor.document;
        outputChannel.appendLine(`Файл: ${document.fileName}, строк: ${document.lineCount}`);

        const config = vscode.workspace.getConfiguration('auto-number-requirements');
        const requirementTypes = config.get<string[]>('requirementTypes', ['FR', 'NFR']);
        const startFrom = Math.max(1, config.get<number>('startFrom', 1));

        outputChannel.appendLine(`Типы: ${requirementTypes.join(', ')}, нумерация с: ${startFrom}`);

        const lines = Array.from({ length: document.lineCount }, (_, i) => ({
            text: document.lineAt(i).text
        }));

        const result = renumber(lines, requirementTypes, startFrom);

        if (result.duplicates.length > 0) {
            outputChannel.appendLine(`Дубликаты: ${result.duplicates.join('; ')}`);
            const action = await vscode.window.showWarningMessage(
                `Обнаружены дубликаты (${result.duplicates.length}). Всё равно применить нумерацию?`,
                'Применить',
                'Отмена'
            );
            if (action !== 'Применить') { return; }
        }

        if (result.edits.length === 0) {
            vscode.window.showInformationMessage('Требования не найдены или нумерация уже корректна.');
            outputChannel.appendLine('Результат: изменений нет.');
            return;
        }

        const textEdits = result.edits.map(e =>
            vscode.TextEdit.replace(
                new vscode.Range(e.lineIndex, e.numberStart, e.lineIndex, e.numberEnd),
                e.newNumber
            )
        );

        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, textEdits);
        const success = await vscode.workspace.applyEdit(workspaceEdit);

        if (success) {
            vscode.window.showInformationMessage(`Обновлено требований: ${result.edits.length}.`);
            outputChannel.appendLine(`Обновлено строк: ${result.edits.length}.`);
            updateStatusBar(vscode.window.activeTextEditor);
        } else {
            vscode.window.showErrorMessage('Не удалось применить изменения.');
            outputChannel.appendLine('Ошибка применения правок.');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    if (outputChannel) { outputChannel.dispose(); }
    if (statusBarItem) { statusBarItem.dispose(); }
}
