# DEV_CHECKLIST

## Development Log

| Дата/время | Действие | Причина | Файлы | Проверка | Результат |
|---|---|---|---|---|---|
| 2026-05-06 17:36:42 +03:00 | Начата задача поддержки Cursor IDE | Требование пользователя: расширение должно поддерживать Cursor IDE и быть доступно через marketplace Cursor | DEV_CHECKLIST.md | Создание файла | Выполнено |
| 2026-05-06 17:37:33 +03:00 | Выполнен анализ проекта | Расширение использует стандартный VS Code Extension API; для Cursor нужен путь публикации в Open VSX | package.json, README.md, src/extension.ts, src/renumber.ts, src/test/renumber.test.ts | Чтение файлов проекта | Runtime-код не требует изменений |
| 2026-05-06 18:08:01 +03:00 | Получены данные для публикации | Пользователь предоставил namespace `hereiamgosu` и Open VSX PAT | DEV_CHECKLIST.md | `npx ovsx --help` | Подтвержден параметр `--pat`; токен не записан в файлы |
| 2026-05-06 18:10:45 +03:00 | Подготовлен workflow публикации | `ovsx publish` упаковывает расширение сам; отдельной команды `ovsx package` в CLI 0.10.11 нет | package.json, package-lock.json | `npm run package:open-vsx` | Команда упаковки не применима; оставлен publish workflow |
| 2026-05-06 18:13:22 +03:00 | Подготовлена новая версия | Версия 1.0.4 уже была опубликована; для публикации нужен новый semver | package.json, package-lock.json, .vscodeignore | `npx ovsx -p <token> publish --skip-duplicate` | Версия повышена до 1.0.5; dev-файлы исключены из VSIX |
| 2026-05-06 18:16:24 +03:00 | Выполнена публикация Open VSX | Требование пользователя: опубликовать расширение для Cursor/Open VSX | package.json, package-lock.json, .vscodeignore, DEV_CHECKLIST.md | `npx ovsx get --metadata -v 1.0.5 hereiamgosu.auto-number-requirements` | Опубликована и подтверждена версия 1.0.5 |
| 2026-05-06 18:20:55 +03:00 | Уточнена область README | Пользователь указал, что README должен оставаться только пользовательским гайдом без админских инструкций | README.md, DEV_CHECKLIST.md | `git diff -- README.md` | README не изменен; админские инструкции не добавляются |

## Current Task

| Поле | Значение |
|---|---|
| Задача | Опубликовать расширение в Open VSX для доступности в Cursor IDE |
| Источник требования | Сообщения пользователя от 2026-05-06 |
| Статус | Завершено |
| Риски | Open VSX PAT был передан в чат и один раз попал в npm command output при неудачной попытке; токен нужно отозвать/перевыпустить |
| Definition of Done | Публикация выполнена; версия подтверждена через Open VSX metadata; тесты и сборка пройдены; README не содержит админских инструкций; DEV_CHECKLIST обновлен |

## Test Matrix

| Область | Команда / сценарий | Результат | Комментарий |
|---|---|---|---|
| Jest | `npx --yes jest --runInBand --no-coverage` | Не пройдено | Проект использует Mocha globals и TS без Jest-трансформера; ошибка `suite is not defined` |
| Unit | `npm test` | Пройдено | 12 passing |
| Build | `npm run build` | Пройдено | TypeScript compile выполнен |
| Open VSX PAT | `npx ovsx verify-pat hereiamgosu -p <token>` | Пройдено | PAT valid to publish at hereiamgosu |
| Open VSX publish | `npx ovsx -p <token> publish --skip-duplicate` | Пройдено | Published `hereiamgosu.auto-number-requirements` v1.0.5 |
| Open VSX metadata | `npx ovsx get --metadata -v 1.0.5 hereiamgosu.auto-number-requirements` | Пройдено | Metadata вернул version 1.0.5 и latest alias |
| README | `git diff -- README.md` | Пройдено | Изменений README нет |

## Changelog

### Unreleased

#### Added

- Скрипт `publish:open-vsx` для публикации в Open VSX.
- Скрипт `build` как alias к существующему `compile`.

#### Changed

- Версия повышена до 1.0.5 для публикации нового пакета.
- `.vscodeignore` исключает `DEV_CHECKLIST.md` и `out/test/**` из публикуемого VSIX.

#### Fixed

- README оставлен без админских инструкций по публикации.

#### Tests

- `npm test`
- `npm run build`
- `npx ovsx get --metadata -v 1.0.5 hereiamgosu.auto-number-requirements`

## Open Questions

| Вопрос | Почему важен | Что блокирует | Возможное действие |
|---|---|---|---|
| Нужно ли отозвать опубликованный в чате Open VSX PAT? | Токен больше нельзя считать секретным | Не блокирует опубликованную версию | Отозвать текущий PAT в Open VSX и создать новый при необходимости |
