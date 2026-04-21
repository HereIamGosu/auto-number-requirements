import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Auto-number Requirements');

    const commandId = 'auto-number-requirements.numberRequirements';
    const disposable = vscode.commands.registerCommand(commandId, async () => {
        outputChannel.appendLine('--- Запуск команды ---');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Нет активного редактора.');
            outputChannel.appendLine('Ошибка: нет активного редактора.');
            return;
        }

        const document = editor.document;
        outputChannel.appendLine(`Файл: ${document.fileName}`);
        outputChannel.appendLine(`Строк в документе: ${document.lineCount}`);

        const edits = await renumberRequirements(document);

        if (edits.length === 0) {
            vscode.window.showInformationMessage('Требования FR/NFR не найдены.');
            outputChannel.appendLine('Результат: 0 найденных строк.');
            outputChannel.show();
            return;
        }

        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, edits);
        const success = await vscode.workspace.applyEdit(workspaceEdit);

        if (success) {
            vscode.window.showInformationMessage(`Обновлено требований: ${edits.length}.`);
            outputChannel.appendLine(`Обновлено строк: ${edits.length}.`);
        } else {
            vscode.window.showErrorMessage('Не удалось применить изменения.');
            outputChannel.appendLine('Ошибка применения правок.');
        }
    });

    context.subscriptions.push(disposable);
}

interface RequirementEntry {
    lineIndex: number;
    // Позиция начала группы 1 (префикс) в строке
    prefixStart: number;
    // Длина префикса (группа 1: "##### FR-VCS-STR0006262-")
    prefixLength: number;
    type: 'FR' | 'NFR';
    oldNumber: string;
}

async function renumberRequirements(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
    const config = vscode.workspace.getConfiguration('auto-number-requirements');
    const patternStr = config.get<string>(
        'pattern',
        // Группа 1: полный префикс (##### FR-VCS-STR0006262-)
        // Группа 2: тип (FR или NFR)
        // Группа 3: номер (может быть пустым)
        '^\\s*(##### (FR|NFR)-[A-Za-z0-9-]+-)(\\d*)'
    );
    outputChannel.appendLine(`Используемый паттерн: ${patternStr}`);

    let regex: RegExp;
    try {
        regex = new RegExp(patternStr);
    } catch (e) {
        vscode.window.showErrorMessage(`Ошибка в регулярном выражении: ${e}`);
        outputChannel.appendLine(`Ошибка regex: ${e}`);
        return [];
    }

    const frEntries: RequirementEntry[] = [];
    const nfrEntries: RequirementEntry[] = [];

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const match = regex.exec(line);
        if (!match) { continue; }

        // match.index — начало всего совпадения (включая ведущие пробелы)
        // match[1] — группа 1 (префикс без ведущих пробелов)
        // prefixStart = позиция, где начинается группа 1 в строке
        const prefixStart = match.index + match[0].length - match[1].length - (match[3] || '').length;
        const type = match[2] as 'FR' | 'NFR';
        const oldNumber = match[3] || '';

        if (frEntries.length + nfrEntries.length < 5) {
            outputChannel.appendLine(`Строка ${i}: "${line}" → тип: ${type}, номер: "${oldNumber}"`);
        }

        const entry: RequirementEntry = {
            lineIndex: i,
            prefixStart,
            prefixLength: match[1].length,
            type,
            oldNumber,
        };

        if (type === 'FR') {
            frEntries.push(entry);
        } else {
            nfrEntries.push(entry);
        }
    }

    outputChannel.appendLine(`Найдено FR: ${frEntries.length}, NFR: ${nfrEntries.length}`);

    const edits: vscode.TextEdit[] = [];

    const applyNumbering = (entries: RequirementEntry[]) => {
        entries.forEach((entry, idx) => {
            const newNumber = (idx + 1).toString();
            if (newNumber === entry.oldNumber) { return; }

            const originalLine = document.lineAt(entry.lineIndex).text;
            // Заменяем только старый номер новым, не трогая остальное
            const numberStart = entry.prefixStart + entry.prefixLength;
            const numberEnd = numberStart + entry.oldNumber.length;
            const range = new vscode.Range(
                entry.lineIndex, numberStart,
                entry.lineIndex, numberEnd
            );
            edits.push(vscode.TextEdit.replace(range, newNumber));
        });
    };

    applyNumbering(frEntries);
    applyNumbering(nfrEntries);

    return edits;
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
