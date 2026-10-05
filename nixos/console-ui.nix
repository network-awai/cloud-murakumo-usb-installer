{ pkgs, ... }: {
  fonts.packages = [ pkgs.noto-fonts-cjk-sans ];
  fonts.fontconfig.enable = true;
  environment.systemPackages = with pkgs; [ dialog fbterm networkmanager ];
  environment.etc."murakumo/network-setup.mjs".source = ./network-setup.mjs;
  environment.etc."murakumo/setup-ui.mjs".source = ./setup-ui.mjs;
  environment.etc."murakumo/registration-ui.mjs".source = ./registration-ui.mjs;
  environment.etc."murakumo/launch-ui".source = pkgs.writeShellScript "murakumo-console-ui" ''
    export TERM=linux LC_ALL=C.UTF-8
    if [ -c /dev/fb0 ]; then
      session=$(${pkgs.coreutils}/bin/mktemp -d /run/murakumo-ui/session.XXXXXX)
      export MURAKUMO_UI_SESSION="$session" MURAKUMO_UI_LANG=ja
      ${pkgs.fbterm}/bin/fbterm --font-names='Noto Sans Mono CJK JP,Noto Sans CJK JP' --font-size=18 --font-width=10 --font-height=24 -- ${pkgs.bash}/bin/bash -c '
        : > "$MURAKUMO_UI_SESSION/started"
        "$@"
        result=$?
        printf "%s" "$result" > "$MURAKUMO_UI_SESSION/result"
        exit "$result"
      ' murakumo-ui "$@"
      # fbterm may return zero even when its child failed. Never rerun an
      # installer that already started, including after a console exit.
      if [ -f "$session/started" ]; then
        result=1
        [ ! -f "$session/result" ] || result=$(cat "$session/result")
        ${pkgs.coreutils}/bin/rm -rf "$session"
        exit "$result"
      fi
      ${pkgs.coreutils}/bin/rm -rf "$session"
    fi
    export MURAKUMO_UI_LANG=en
    exec "$@"
  '';
}
