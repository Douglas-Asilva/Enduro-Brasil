"""Gera dist/enduro-brasil.html: o jogo inteiro num único arquivo, para compartilhar.

Embute no HTML os scripts de src/ (na mesma ordem do index.html) e a fonte Press Start 2P
(assets/, licença SIL OFL), então o arquivo funciona sozinho e até sem internet.

Uso:  python build.py
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
SRC_HTML = ROOT / 'index.html'
FONT = ROOT / 'assets' / 'PressStart2P-latin.woff2'
OUT = ROOT / 'dist' / 'enduro-brasil.html'


def inline_script(match):
    path = ROOT / match.group(1)
    code = path.read_text(encoding='utf-8')
    # "</script" dentro do código fecharia a tag antes da hora
    code = code.replace('</script', '<\\/script')
    return f'<script>\n/* ---- {match.group(1)} ---- */\n{code}\n</script>'


def main():
    html = SRC_HTML.read_text(encoding='utf-8')

    # Fonte: troca os <link> do Google Fonts por um @font-face embutido
    font64 = base64.b64encode(FONT.read_bytes()).decode('ascii')
    font_css = (
        '<style>\n'
        '  /* Press Start 2P (CodeMan38) — SIL Open Font License 1.1 */\n'
        "  @font-face { font-family: 'Press Start 2P'; font-style: normal; font-weight: 400;\n"
        f"    src: url(data:font/woff2;base64,{font64}) format('woff2'); }}\n"
        '</style>'
    )
    html, n_links = re.subn(r'\s*<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>', '', html)
    html = html.replace('</head>', f'{font_css}\n</head>', 1)

    # Scripts: cada <script src="..."> vira o próprio código
    html, n_scripts = re.subn(r'<script src="([^"]+)"></script>', inline_script, html)

    if re.search(r'<(script|link)[^>]+(src|href)=', html):
        raise SystemExit('Sobrou alguma referência externa no HTML gerado.')

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8', newline='\n')
    print(f'{OUT.relative_to(ROOT)}: {OUT.stat().st_size / 1024:.0f} KB '
          f'({n_scripts} scripts e a fonte embutidos, {n_links} links externos removidos)')


if __name__ == '__main__':
    main()
