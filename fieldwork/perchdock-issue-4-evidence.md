# Fieldwork 001 — PerchDock #4

Upstream issue: https://github.com/slynck/perchdock/issues/4
Upstream repository: https://github.com/slynck/perchdock (GPL-3.0)
Upstream source file: scripts/build.sh at content SHA 1e1b12d7286e837f8bd52e2b5e915b765aae1b92
Artifact: perchdock-issue-4.patch

Observed defect:
--instal silently falls through and launches normal build/signing flow.

Proposed fix:
A bounded preflight argument guard before changing working directory or
executing scripts/setup-signing.sh, plus an instant -h/--help using only
the Usage comments already present in the file.

Local independent checks, 10 Nov 2026:
PASS: bash -n
PASS: git diff --check
PASS: --help prints original Usage, exits 0, no signing/build side effects
PASS: -h prints identical help, exits 0
PASS: --instal exits nonzero with stderr error and Usage, no side effects
PASS: no argument continues existing build flow (Mac commands safely mocked)
PASS: --run launches existing app path (Mac commands safely mocked)
PASS: --install retains existing path (all destructive/system commands mocked)

Limitations:
- Linux local checks, no actual macOS/Xcode installation or signing.
- Not yet confirmed accepted by project maintainer.
- No bounty was advertised or promised for this issue.
- Payment verified: RM0.
- Open-source GPL-3.0 contribution; no change to MYReady.
