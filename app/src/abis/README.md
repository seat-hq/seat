# ABIs

Contract ABIs are copied from Foundry `out/<Contract>.sol/<Contract>.json`
after `forge build`. They are not hand-written.

| File | Source |
|---|---|
| `DeskVault.json` | `out/DeskVault.sol/DeskVault.json` |
| `DeskFactory.json` | `out/DeskFactory.sol/DeskFactory.json` |
| `IERC20.json` | `out/IERC20.sol/IERC20.json` (OpenZeppelin) |

Re-extract after a contract change:

```bash
python3 - <<'PY'
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[2] if False else pathlib.Path(".")
# from repo root:
root = pathlib.Path(".")
out = root / "app" / "src" / "abis"
for src, dest in [
    ("out/DeskVault.sol/DeskVault.json", "DeskVault.json"),
    ("out/DeskFactory.sol/DeskFactory.json", "DeskFactory.json"),
    ("out/IERC20.sol/IERC20.json", "IERC20.json"),
]:
    abi = json.loads((root / src).read_text())["abi"]
    (out / dest).write_text(json.dumps(abi, indent=2) + "\n")
PY
```

Do not fabricate ABIs or addresses. Wire 46630 addresses via
`scripts/write-addresses.ts` after a real deploy.
