export interface LineData {
    text: string;
}

export interface RenumberEntry {
    lineIndex: number;
    numberStart: number;
    numberEnd: number;
    newNumber: string;
}

export interface RenumberOutput {
    edits: RenumberEntry[];
    duplicates: string[];
}

export function buildRegex(requirementTypes: string[]): RegExp {
    const types = requirementTypes
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    return new RegExp(`^\\s*(##### (${types})-[A-Za-z0-9-]+-)([0-9]*)`);
}

export function renumber(
    lines: LineData[],
    requirementTypes: string[],
    startFrom: number
): RenumberOutput {
    const regex = buildRegex(requirementTypes);

    const entriesByType: Record<string, Array<{ lineIndex: number; prefixStart: number; prefixLength: number; oldNumber: string }>> = {};
    for (const t of requirementTypes) { entriesByType[t] = []; }

    for (let i = 0; i < lines.length; i++) {
        const match = regex.exec(lines[i].text);
        if (!match) { continue; }

        const prefixStart = match.index + match[0].length - match[1].length - (match[3] || '').length;
        const type = match[2];
        const oldNumber = match[3] || '';
        (entriesByType[type] ??= []).push({ lineIndex: i, prefixStart, prefixLength: match[1].length, oldNumber });
    }

    // Detect duplicates
    const duplicates: string[] = [];
    for (const [type, entries] of Object.entries(entriesByType)) {
        const seen = new Map<string, number[]>();
        for (const e of entries) {
            if (e.oldNumber === '') { continue; }
            const key = `${type}-${e.oldNumber}`;
            const arr = seen.get(key) ?? [];
            arr.push(e.lineIndex + 1);
            seen.set(key, arr);
        }
        for (const [key, lineNums] of seen) {
            if (lineNums.length > 1) {
                duplicates.push(`${key} на строках: ${lineNums.join(', ')}`);
            }
        }
    }

    const edits: RenumberEntry[] = [];
    for (const entries of Object.values(entriesByType)) {
        for (let idx = 0; idx < entries.length; idx++) {
            const e = entries[idx];
            const newNumber = (startFrom + idx).toString();
            if (newNumber === e.oldNumber) { continue; }
            const numberStart = e.prefixStart + e.prefixLength;
            const numberEnd = numberStart + e.oldNumber.length;
            edits.push({ lineIndex: e.lineIndex, numberStart, numberEnd, newNumber });
        }
    }

    return { edits, duplicates };
}

export function countByType(lines: LineData[], requirementTypes: string[]): Record<string, number> {
    const regex = buildRegex(requirementTypes);
    const counts: Record<string, number> = {};
    for (const t of requirementTypes) { counts[t] = 0; }
    for (const line of lines) {
        const match = regex.exec(line.text);
        if (match) { counts[match[2]] = (counts[match[2]] ?? 0) + 1; }
    }
    return counts;
}
