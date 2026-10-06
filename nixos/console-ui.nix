{ pkgs, ... }:
let
  graphical = pkgs.stdenvNoCC.mkDerivation {
    pname = "murakumo-setup-ui";
    version = "1";
    dontUnpack = true;
    nativeBuildInputs = [ pkgs.wrapGAppsHook4 pkgs.gobject-introspection ];
    buildInputs = [ pkgs.gtk4 pkgs.gjs pkgs.adwaita-icon-theme ];
    installPhase = ''
      mkdir -p $out/bin
      cp ${./graphical-ui.js} $out/bin/murakumo-setup-ui
      chmod +x $out/bin/murakumo-setup-ui
      substituteInPlace $out/bin/murakumo-setup-ui --replace-fail /usr/bin/env\ gjs ${pkgs.gjs}/bin/gjs
    '';
  };
  graphicalDialog = pkgs.writeShellScriptBin "dialog" ''
    exec ${pkgs.nodejs_22}/bin/node /etc/murakumo/graphical-dialog.mjs "$@"
  '';
in {
  services.seatd.enable = true;
  fonts.packages = [ pkgs.noto-fonts-cjk-sans ];
  fonts.fontconfig.enable = true;
  environment.systemPackages = with pkgs; [ dialog fbterm networkmanager weston qrencode graphical ];
  environment.etc."murakumo/graphical-ui.js".source = ./graphical-ui.js;
  environment.etc."murakumo/graphical-dialog.mjs".source = ./graphical-dialog.mjs;
  environment.etc."murakumo/network-setup.mjs".source = ./network-setup.mjs;
  environment.etc."murakumo/setup-ui.mjs".source = ./setup-ui.mjs;
  environment.etc."murakumo/registration-ui.mjs".source = ./registration-ui.mjs;
  environment.etc."murakumo/launch-ui".source = pkgs.writeShellScript "murakumo-console-ui" ''
    export TERM=linux LC_ALL=C.UTF-8
    # Start a single application compositor with software rendering. The
    # backend runs only after its private UI transport is listening.
    session=$(${pkgs.coreutils}/bin/mktemp -d /run/murakumo-ui/session.XXXXXX)
    export MURAKUMO_UI_SESSION="$session" MURAKUMO_UI_LANG=ja
    export LIBSEAT_BACKEND=seatd
    export XDG_RUNTIME_DIR="$session" WAYLAND_DISPLAY=murakumo-wayland
    export MURAKUMO_UI_SOCKET="$session/ui.sock" GDK_BACKEND=wayland GSK_RENDERER=cairo
    # Wait for input-device classification before Weston enumerates its seat.
    ${pkgs.systemd}/bin/udevadm settle --timeout=30 || true
    ${pkgs.weston}/bin/weston --backend=drm-backend.so --shell=kiosk-shell.so --renderer=pixman --socket="$WAYLAND_DISPLAY" --idle-time=0 --log="$session/weston.log" &
    compositor=$!
    for attempt in $(${pkgs.coreutils}/bin/seq 1 100); do
      [ ! -S "$session/$WAYLAND_DISPLAY" ] || break
      kill -0 "$compositor" 2>/dev/null || break
      ${pkgs.coreutils}/bin/sleep 0.1
    done
    if [ -S "$session/$WAYLAND_DISPLAY" ]; then
      PATH=${graphicalDialog}/bin:$PATH ${graphical}/bin/murakumo-setup-ui "$@" > "$session/frontend.log" 2>&1
    fi
    kill "$compositor" 2>/dev/null || true
    wait "$compositor" 2>/dev/null || true
    ${pkgs.kbd}/bin/chvt 1 || true
    if [ -f "$session/started" ]; then
      # No console fallback after the backend started, even if GTK crashed.
      result=1
      [ ! -f "$session/result" ] || result=$(cat "$session/result")
      exit "$result"
    fi
    unset MURAKUMO_UI_SOCKET GDK_BACKEND GSK_RENDERER WAYLAND_DISPLAY XDG_RUNTIME_DIR
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
