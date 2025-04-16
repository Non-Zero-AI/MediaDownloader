{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.ffmpeg
    pkgs.python3
    pkgs.python3Packages.pip
  ];
}
