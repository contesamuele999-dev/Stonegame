# piccolo aiuto per modificare le statistiche delle carte in engine.js
import re, sys
p = 'engine.js'
s = open(p).read()
def stat(cid, **kw):
    global s
    i = s.index(f"id: '{cid}'"); j = s.index('\n', i); line = s[i:j]
    for k, v in kw.items():
        line = re.sub(rf"\b{k}: -?\d+", f"{k}: {v}", line, count=1)
    s = s[:i] + line + s[j:]
def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)
exec(open(sys.argv[1]).read())
open(p, 'w').write(s)
