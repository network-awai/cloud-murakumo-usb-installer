#!/bin/sh
set -eu
[ "$(/usr/bin/id -u)" = 0 ] || { echo 'Administrator setup is required once.'; exit 1; }
source=/Users/junkawasaki/github/murakumo-usb-auto-install-qa/murakumo-usb-writer
expected=3b424555f51c72c90860cb1393d242ab6586750775c16a9938bf09da385da689
helper=/Library/PrivilegedHelperTools/cloud.murakumo.kioxia-writer
rule=/private/etc/sudoers.d/murakumo-kioxia-writer
[ "$(/usr/bin/shasum -a 256 "$source" | /usr/bin/awk '{print $1}')" = "$expected" ]
/usr/bin/grep -Eq '^[#@]includedir[[:space:]]+(/private)?/etc/sudoers.d' /private/etc/sudoers
[ ! -L /Library/PrivilegedHelperTools ] && [ ! -L /private/etc/sudoers.d ]
[ ! -L "$helper" ] && [ ! -L "$rule" ]
/usr/bin/install -d -o root -g wheel -m 755 /Library/PrivilegedHelperTools /private/etc/sudoers.d
/usr/bin/install -o root -g wheel -m 755 "$source" "$helper"
[ "$(/usr/bin/shasum -a 256 "$helper" | /usr/bin/awk '{print $1}')" = "$expected" ]
policy=$(/usr/bin/mktemp /private/etc/sudoers.d/.murakumo.XXXXXX)
trap '/bin/rm -f "$policy"' EXIT
/usr/bin/printf 'junkawasaki ALL=(root) NOPASSWD: sha256:%s %s ""\n' "$expected" "$helper" > "$policy"
/usr/sbin/visudo -cf "$policy"
/usr/sbin/chown root:wheel "$policy"
/bin/chmod 440 "$policy"
/bin/mv "$policy" "$rule"
/usr/sbin/visudo -c
/bin/echo 'KIOXIA-only passwordless helper installed.'
