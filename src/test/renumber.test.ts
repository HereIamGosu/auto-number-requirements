import * as assert from 'assert';
import { renumber, countByType, buildRegex } from '../renumber';

const L = (text: string) => ({ text });

suite('renumber()', () => {
    test('нумерует FR с 1', () => {
        const lines = [
            L('##### FR-VCS-STR0006262- Заголовок'),
            L('##### FR-VCS-STR0006262- Другой'),
        ];
        const { edits, duplicates } = renumber(lines, ['FR', 'NFR'], 1);
        assert.strictEqual(duplicates.length, 0);
        assert.strictEqual(edits.length, 2);
        assert.strictEqual(edits[0].newNumber, '1');
        assert.strictEqual(edits[1].newNumber, '2');
    });

    test('пропускает строки с правильным номером', () => {
        const lines = [
            L('##### FR-VCS-1 Заголовок'),
            L('##### FR-VCS-2 Другой'),
        ];
        const { edits } = renumber(lines, ['FR', 'NFR'], 1);
        assert.strictEqual(edits.length, 0);
    });

    test('нумеруется с startFrom=10', () => {
        const lines = [
            L('##### FR-VCS- Первый'),
            L('##### FR-VCS- Второй'),
        ];
        const { edits } = renumber(lines, ['FR', 'NFR'], 10);
        assert.strictEqual(edits[0].newNumber, '10');
        assert.strictEqual(edits[1].newNumber, '11');
    });

    test('FR и NFR нумеруются независимо', () => {
        const lines = [
            L('##### FR-VCS- Первый FR'),
            L('##### NFR-VCS- Первый NFR'),
            L('##### FR-VCS- Второй FR'),
        ];
        const { edits } = renumber(lines, ['FR', 'NFR'], 1);
        const fr1 = edits.find(e => e.lineIndex === 0);
        const nfr = edits.find(e => e.lineIndex === 1);
        const fr2 = edits.find(e => e.lineIndex === 2);
        assert.strictEqual(fr1?.newNumber, '1');
        assert.strictEqual(nfr?.newNumber, '1');
        assert.strictEqual(fr2?.newNumber, '2');
    });

    test('обнаруживает дубликаты', () => {
        const lines = [
            L('##### FR-VCS-5 Первый'),
            L('##### FR-VCS-5 Второй'),
        ];
        const { duplicates } = renumber(lines, ['FR', 'NFR'], 1);
        assert.strictEqual(duplicates.length, 1);
        assert.ok(duplicates[0].includes('FR-5'));
    });

    test('не считает пустые номера дубликатами', () => {
        const lines = [
            L('##### FR-VCS- Первый'),
            L('##### FR-VCS- Второй'),
        ];
        const { duplicates } = renumber(lines, ['FR', 'NFR'], 1);
        assert.strictEqual(duplicates.length, 0);
    });

    test('поддерживает пользовательские типы (BR, UR)', () => {
        const lines = [
            L('##### BR-VCS- Бизнес-требование'),
            L('##### UR-VCS- Пользовательское'),
        ];
        const { edits } = renumber(lines, ['BR', 'UR'], 1);
        assert.strictEqual(edits.length, 2);
    });

    test('игнорирует строки без префикса', () => {
        const lines = [
            L('Просто текст'),
            L('## Раздел'),
            L('##### FR-VCS- Требование'),
        ];
        const { edits } = renumber(lines, ['FR', 'NFR'], 1);
        assert.strictEqual(edits.length, 1);
    });
});

suite('countByType()', () => {
    test('считает FR и NFR', () => {
        const lines = [
            L('##### FR-VCS-1 a'),
            L('##### FR-VCS-2 b'),
            L('##### NFR-VCS-1 c'),
        ];
        const counts = countByType(lines, ['FR', 'NFR']);
        assert.strictEqual(counts['FR'], 2);
        assert.strictEqual(counts['NFR'], 1);
    });

    test('возвращает 0 для типов без совпадений', () => {
        const lines = [L('текст без требований')];
        const counts = countByType(lines, ['FR', 'NFR']);
        assert.strictEqual(counts['FR'], 0);
        assert.strictEqual(counts['NFR'], 0);
    });
});

suite('buildRegex()', () => {
    test('матчит строку FR', () => {
        const re = buildRegex(['FR', 'NFR']);
        assert.ok(re.test('##### FR-VCS-STR0006262-5'));
    });

    test('не матчит без ##### префикса', () => {
        const re = buildRegex(['FR', 'NFR']);
        assert.ok(!re.test('FR-VCS-1 текст'));
    });
});
