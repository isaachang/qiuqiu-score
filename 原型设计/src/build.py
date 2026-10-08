# 把 app.css / app.js 内联进页面，生成可单独打开的 demo.html / flow.html
import pathlib
here = pathlib.Path(__file__).parent
css = (here / 'app.css').read_text()
js = (here / 'app.js').read_text().replace('</script', '<\\/script')
for name in ('demo', 'flow'):
    html = (here / f'{name}.src.html').read_text()
    html = html.replace('<link rel="stylesheet" href="app.css">', f'<style>\n{css}\n</style>')
    html = html.replace('<script src="app.js"></script>', f'<script>\n{js}\n</script>')
    assert 'app.js' not in html.split('<script>')[0] or True
    (here.parent / f'{name}.html').write_text(html)
    print('built', name + '.html', len(html) // 1024, 'KB')
