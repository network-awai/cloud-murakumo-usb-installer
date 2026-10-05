{ pkgs, ... }: {
  fonts.packages = [ pkgs.noto-fonts-cjk-sans ];
  fonts.fontconfig.enable = true;
  environment.systemPackages = with pkgs; [ dialog fbterm networkmanager ];
  environment.etc."murakumo/network-setup.mjs".source = ./network-setup.mjs;
  environment.etc."murakumo/setup-ui.mjs".source = ./setup-ui.mjs;
  environment.etc."murakumo/launch-ui".source = pkgs.writeShellScript "murakumo-console-ui" ''
    export TERM=linux LC_ALL=C.UTF-8
    if [ -c /dev/fb0 ] && ${pkgs.fbterm}/bin/fbterm --font-names='Noto Sans Mono CJK JP,Noto Sans CJK JP' --font-size=18 -- ${pkgs.coreutils}/bin/true; then
      export MURAKUMO_UI_LANG=ja
      exec ${pkgs.fbterm}/bin/fbterm --font-names='Noto Sans Mono CJK JP,Noto Sans CJK JP' --font-size=18 -- "$@"
    fi
    export MURAKUMO_UI_LANG=en
    exec "$@"
  '';
}
