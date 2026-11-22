#!/usr/bin/env python3
"""UniversalMenu plugin store tool.

  python tools/store.py sync                 copy the official plugins listed in official.json from ~/Mods/imgui_plugins, rebuild index
  python tools/store.py build                rebuild index.json from official/ + community/
  python tools/store.py scan FILE...         run the safety scan on files
  python tools/store.py pending              list uploads waiting for approval (needs the admin key)
  python tools/store.py show SUB_ID          download an upload to review/ and scan it
  python tools/store.py approve SUB_ID [--as PLUGIN_ID]   publish it in community/ (untrusted), rebuild, commit + push
  python tools/store.py reject SUB_ID        delete an upload
  python tools/store.py publish [-m MSG]     git commit + push everything

Uploads go to the chat_server Worker (POST /v1/store/submit). Admin key: $UM_ADMIN_KEY or ~/.config/universalmenu/admin_key
(the same ADMIN_KEY secret the worker has). Worker URL: $UM_STORE_URL or the default below.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGINS_SRC = os.path.expanduser(os.environ.get("UM_PLUGINS", "~/Mods/imgui_plugins"))
STORE_URL = os.environ.get("UM_STORE_URL", "https://menu-chat.lcskidgtag.workers.dev").rstrip("/")
GAME_LINE = re.compile(r"^[ \t/*#@]*games?\s*[:=]\s*(.+)$", re.I | re.M)
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,39}$")
FILE_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}\.(js|txt|png)$")
SEV_ORDER = {"high": 0, "medium": 1, "low": 2}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 16), b""):
            h.update(b)
    return h.hexdigest()


def games_of(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        head = "".join(f.readline() for _ in range(40))
    m = GAME_LINE.search(head)
    if not m:
        return []
    return [g for g in re.split(r"[,\s;]+", re.sub(r"\*/\s*$", "", m.group(1))) if g]


def first_comment(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        for _ in range(14):
            s = f.readline().strip()
            if not s.startswith(("//", "*", "/*")):
                continue
            s = re.sub(r"^(/\*+|\*+|//+)\s*", "", s).strip()
            s = re.sub(r"[║╔╗╚╝═]", "", s).strip()
            if not s or re.match(r"(?i)^(games?|soundboard)\s*[:=]", s) or s in ('"use strict";',):
                continue
            return s[:200]
    return ""


# ---------------------------------------------------------------- scan
def load_rules():
    with open(os.path.join(HERE, "scan_rules.json"), encoding="utf-8") as f:
        rules = json.load(f)["rules"]
    for r in rules:
        r["rx"] = re.compile(r["re"])
    return rules


def scan_text(text, rules):
    """[{id, sev, label, why, hits:[(line_no, snippet)]}] most severe first"""
    out = []
    lines = text.split("\n")
    m = GAME_LINE.search("\n".join(lines[:40]))
    own = [g for g in re.split(r"[,\s;]+", re.sub(r"\*/\s*$", "", m.group(1))) if g and g != "*"] if m else []
    own.append("APP_ID")
    for r in rules:
        hits = []
        for i, line in enumerate(lines):
            if len(line) > 4000:
                line = line[:4000]
            m = r["rx"].search(line)
            if m and r.get("own_game_ok") and any(g in line for g in own):
                continue
            if m:
                a = max(0, m.start() - 40)
                hits.append((i + 1, line[a:m.end() + 40].strip()))
                if len(hits) >= 50:
                    break
        if hits:
            out.append({"id": r["id"], "sev": r["sev"], "label": r["label"], "why": r["why"], "hits": hits})
    longest = max((len(l) for l in lines), default=0)
    if longest > 5000:
        out.append({"id": "long-line", "sev": "medium", "label": "Has a %d-character line (minified / packed code)" % longest,
                    "why": "Minified code is very hard to review. Ask for the readable source.", "hits": []})
    out.sort(key=lambda x: SEV_ORDER[x["sev"]])
    return out


def scan_summary(findings):
    s = {"high": 0, "medium": 0, "low": 0}
    for f in findings:
        s[f["sev"]] += 1
    return s


def print_report(name, findings):
    s = scan_summary(findings)
    print("\n== %s: %d high, %d medium, %d low" % (name, s["high"], s["medium"], s["low"]))
    for f in findings:
        print("  [%s] %s  (%d hits)\n         %s" % (f["sev"].upper(), f["label"], len(f["hits"]), f["why"]))
        for ln, snip in f["hits"][:5]:
            print("         line %d: %s" % (ln, snip[:150]))


# ---------------------------------------------------------------- index
def entry_for(kind, pid, folder, meta, rules, old):
    files = []
    games, scan = [], {"high": 0, "medium": 0, "low": 0}
    for n in meta["files"]:
        p = os.path.join(folder, n)
        files.append({"name": n, "path": "%s/%s/%s" % (kind, pid, n), "sha256": sha256(p), "size": os.path.getsize(p)})
        if n.endswith(".js"):
            for g in games_of(p):
                if g not in games:
                    games.append(g)
            with open(p, encoding="utf-8", errors="replace") as f:
                for k, v in scan_summary(scan_text(f.read(), rules)).items():
                    scan[k] += v
    version = hashlib.sha256("|".join(f["sha256"] for f in files).encode()).hexdigest()[:12]
    prev = old.get(pid, {})
    first_js = next((os.path.join(folder, n) for n in meta["files"] if n.endswith(".js")), None)
    return {
        "id": pid, "name": meta["name"], "trusted": kind == "official",
        "author": meta.get("author", ""), "desc": meta.get("desc") or (first_comment(first_js) if first_js else ""),
        "game": games, "version": version,
        "updated": prev["updated"] if prev.get("version") == version else time.strftime("%Y-%m-%d", time.gmtime()),
        "files": files, "scan": scan,
    }


def build():
    rules = load_rules()
    old = {}
    try:
        with open(os.path.join(HERE, "index.json"), encoding="utf-8") as f:
            old = {p["id"]: p for p in json.load(f)["plugins"]}
    except Exception:
        pass
    plugins = []
    off = json.load(open(os.path.join(HERE, "official.json"), encoding="utf-8"))
    for p in off["plugins"]:
        folder = os.path.join(HERE, "official", p["id"])
        if os.path.isdir(folder):
            plugins.append(entry_for("official", p["id"], folder, dict(p, author=p.get("author", off.get("author", ""))), rules, old))
    cdir = os.path.join(HERE, "community")
    for pid in sorted(os.listdir(cdir)) if os.path.isdir(cdir) else []:
        mp = os.path.join(cdir, pid, "meta.json")
        if os.path.isfile(mp):
            plugins.append(entry_for("community", pid, os.path.join(cdir, pid), json.load(open(mp, encoding="utf-8")), rules, old))
    idx = {"v": 1, "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "plugins": plugins}
    with open(os.path.join(HERE, "index.json"), "w", encoding="utf-8") as f:
        json.dump(idx, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print("index.json: %d plugins (%d official, %d community)" % (
        len(plugins), sum(p["trusted"] for p in plugins), sum(not p["trusted"] for p in plugins)))


def sync():
    off = json.load(open(os.path.join(HERE, "official.json"), encoding="utf-8"))
    want = set()
    for p in off["plugins"]:
        assert ID_RE.match(p["id"]), p["id"]
        want.add(p["id"])
        folder = os.path.join(HERE, "official", p["id"])
        os.makedirs(folder, exist_ok=True)
        for n in os.listdir(folder):
            if n not in p["files"]:
                os.remove(os.path.join(folder, n))
        for n in p["files"]:
            assert FILE_RE.match(n), n
            shutil.copy2(os.path.join(PLUGINS_SRC, n), os.path.join(folder, n))
    for d in os.listdir(os.path.join(HERE, "official")):
        if d not in want:
            shutil.rmtree(os.path.join(HERE, "official", d))
            print("removed official/%s" % d)
    build()


# ---------------------------------------------------------------- worker admin
def admin_key():
    k = os.environ.get("UM_ADMIN_KEY", "")
    p = os.path.expanduser("~/.config/universalmenu/admin_key")
    if not k and os.path.isfile(p):
        k = open(p).read().strip()
    if not k:
        sys.exit("no admin key: set UM_ADMIN_KEY or put it in ~/.config/universalmenu/admin_key (the worker's ADMIN_KEY secret)")
    return k


def call(path, body):
    req = urllib.request.Request(STORE_URL + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"content-type": "application/json", "user-agent": "um-store-tool"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read())
        except Exception:
            return {"ok": False, "err": "HTTP %d" % e.code}


def pending():
    r = call("/v1/store/pending", {"k": admin_key()})
    if not r.get("ok"):
        sys.exit("worker: %s" % r.get("err"))
    if not r["subs"]:
        print("no uploads waiting")
    for s in r["subs"]:
        print("%s  %s  %-28s %-34s by %-16s %6d bytes%s" % (
            s["id"], time.strftime("%m-%d %H:%M", time.localtime(s["t"] / 1000)), s["name"][:28], s["game"][:34],
            s["author"][:16], s["size"], ("  (update for " + s["updates"] + ")") if s.get("updates") else ""))
        if s.get("desc"):
            print("      " + s["desc"][:200])


def fetch_sub(sid):
    r = call("/v1/store/get", {"k": admin_key(), "id": sid})
    if not r.get("ok"):
        sys.exit("worker: %s" % r.get("err"))
    return r["sub"]


def show(sid):
    s = fetch_sub(sid)
    os.makedirs(os.path.join(HERE, "review"), exist_ok=True)
    p = os.path.join(HERE, "review", sid + ".js")
    with open(p, "w", encoding="utf-8") as f:
        f.write(s["code"])
    print("name: %s\ngame: %s\nauthor: %s\nupdates: %s\ndesc: %s\nsaved: %s" % (
        s["name"], s["game"], s["author"], s.get("updates") or "-", s["desc"], p))
    print_report(sid, scan_text(s["code"], load_rules()))
    print("\nREAD THE WHOLE FILE before approving. The scan only catches known patterns.")


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")[:30] or "plugin"


def approve(sid, as_id):
    s = fetch_sub(sid)
    pid = as_id or s.get("updates") or slug(s["name"])
    if not ID_RE.match(pid):
        sys.exit("bad plugin id %r (use --as some-id)" % pid)
    folder = os.path.join(HERE, "community", pid)
    if os.path.isdir(folder) and not (as_id or s.get("updates")):
        sys.exit("community/%s already exists. Use --as %s to replace it (an update) or --as other-id" % (pid, pid))
    if pid in {p["id"] for p in json.load(open(os.path.join(HERE, "official.json")))["plugins"]}:
        sys.exit("%s is an official plugin id, pick another with --as" % pid)
    findings = scan_text(s["code"], load_rules())
    print_report(sid, findings)
    if input("\npublish %s as community/%s (UNTRUSTED)? type yes: " % (sid, pid)).strip() != "yes":
        sys.exit("not published")
    if os.path.isdir(folder):
        shutil.rmtree(folder)
    os.makedirs(folder)
    fname = "c-%s.js" % pid   # community files are always c-<id>.js, so they can never replace an official / local plugin
    with open(os.path.join(folder, fname), "w", encoding="utf-8") as f:
        f.write(s["code"])
    meta = {"name": s["name"], "author": s["author"], "desc": s["desc"], "files": [fname], "submission": sid,
            "approved": time.strftime("%Y-%m-%d", time.gmtime())}
    with open(os.path.join(folder, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)
    build()
    publish("community: %s %s (%s)" % ("update" if as_id or s.get("updates") else "add", pid, sid))
    r = call("/v1/store/drop", {"k": admin_key(), "id": sid})
    print("removed from the queue" if r.get("ok") else "couldn't remove from queue: %s" % r.get("err"))


def reject(sid):
    r = call("/v1/store/drop", {"k": admin_key(), "id": sid})
    print("rejected %s" % sid if r.get("ok") else "worker: %s" % r.get("err"))


def publish(msg):
    subprocess.run(["git", "-C", HERE, "add", "-A"], check=True)
    if subprocess.run(["git", "-C", HERE, "diff", "--cached", "--quiet"]).returncode == 0:
        print("nothing to publish")
        return
    subprocess.run(["git", "-C", HERE, "commit", "-q", "-m", msg], check=True)
    subprocess.run(["git", "-C", HERE, "push", "-q"], check=True)
    print("pushed: apps see it within ~5 minutes (GitHub raw cache)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("sync"); sp.add_parser("build"); sp.add_parser("pending")
    a = sp.add_parser("scan"); a.add_argument("files", nargs="+")
    a = sp.add_parser("show"); a.add_argument("id")
    a = sp.add_parser("approve"); a.add_argument("id"); a.add_argument("--as", dest="as_id")
    a = sp.add_parser("reject"); a.add_argument("id")
    a = sp.add_parser("publish"); a.add_argument("-m", default="store update")
    o = ap.parse_args()
    if o.cmd == "sync": sync()
    elif o.cmd == "build": build()
    elif o.cmd == "pending": pending()
    elif o.cmd == "show": show(o.id)
    elif o.cmd == "approve": approve(o.id, o.as_id)
    elif o.cmd == "reject": reject(o.id)
    elif o.cmd == "publish": publish(o.m)
    elif o.cmd == "scan":
        rules = load_rules()
        for p in o.files:
            print_report(p, scan_text(open(p, encoding="utf-8", errors="replace").read(), rules))


if __name__ == "__main__":
    main()
