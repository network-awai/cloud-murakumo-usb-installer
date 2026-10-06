#!/bin/zsh
set -eu
set -o pipefail
qa=/Users/junkawasaki/github/murakumo-usb-auto-install-qa
helper=/Library/PrivilegedHelperTools/cloud.murakumo.kioxia-writer
log="$qa/usb-write-guided-20261006/passwordless-write.log"
# Preparation is unprivileged. The root helper accepts no paths or arguments.
/opt/homebrew/opt/python@3.14/bin/python3.14 - <<'PY'
import json,os
from pathlib import Path
p=Path('/Users/junkawasaki/github/murakumo-usb-auto-install-qa/usb-write-request.json')
r=json.loads(p.read_text())
r['action']='write'
tmp=p.with_suffix('.tmp')
tmp.write_text(json.dumps(r)+'\n');os.chmod(tmp,0o600);tmp.replace(p)
PY
print '準備済みISOを指定のKIOXIAへ書き込みます。完了までUSBを抜かないでください。'
/usr/bin/sudo -n -k "$helper" 2>&1 | /usr/bin/tee "$log"
print '書き込みと読み戻し照合が完了し、USBを取り外しました。抜いて大丈夫です。'
