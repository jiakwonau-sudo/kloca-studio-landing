# v1-1 scan and navigation repair

The production main branch is unchanged. This branch's `klocalens/v1-1/` is the candidate app. `klocalens/v1/` is unchanged.

Read RESTORE_REPORT.md for verified history, crash reproduction and limitations. The complete ZIP contains the current and historical fixtures needed by analysis/dom-tests/qa-dom.cjs; they are not duplicated here. Run QA from the ZIP root after npm ci in analysis/dom-tests. Hooks and React DOM are real; browser layout is unverified.

Rebuild using fix-src/build-fix.cjs with the original attached deployment directory as its source. It writes fixed/muse-version inside the recovery working folder. The original input Git blob must match the builder's guard.
