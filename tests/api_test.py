"""Testes da API PHP: senha própria no 1º acesso, cadastro e prazo do 1º professor.

Uso: python3 tests/api_test.py
Precisa do `php` (com pdo_sqlite) no PATH, ou do caminho em PHP_BIN. O servidor
sobe numa cópia temporária do projeto, então a pasta data/ real nunca é tocada.
"""

import http.cookiejar
import json
import os
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHP = os.environ.get("PHP_BIN", "php")
failures = 0


class Client:
    """Um navegador: cada cliente tem a sua própria sessão (cookie)."""

    def __init__(self, base):
        self.base = base
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method="POST" if body is not None else "GET",
                                     headers={"Content-Type": "application/json"})
        try:
            resp = self.opener.open(req)
            code, raw = resp.status, resp.read()
        except urllib.error.HTTPError as e:
            code, raw = e.code, e.read()
        try:
            return code, json.loads(raw)
        except ValueError:
            return code, {"raw": raw[:200].decode(errors="replace")}


def check(desc, result, expect_code, **expect):
    global failures
    code, body = result
    ok = code == expect_code and all(body.get(k) == v for k, v in expect.items())
    if not ok:
        failures += 1
    print(f"  {'PASSOU' if ok else 'FALHOU'} | {desc} -> HTTP {code} {json.dumps(body, ensure_ascii=False)[:110]}")


def php_hash(secret):
    out = subprocess.run([PHP, "-r", "echo password_hash($argv[1], PASSWORD_DEFAULT);", secret],
                         check=True, capture_output=True, text=True)
    return out.stdout


def test_fluxo_completo(base, db):
    print("Fluxo completo")
    prof, aluno, anon = Client(base), Client(base), Client(base)
    check("migração", anon.call("migrate.php"), 200, ok=True)
    check("1º cadastro vira professor", anon.call("register.php", {"matricula": "prof1", "dob": "1990-01-01"}), 200, role="teacher")
    check("2º cadastro sem sessão é bloqueado", anon.call("register.php", {"matricula": "x", "dob": "2000-01-01"}), 403, error="forbidden")
    check("professor entra com a data de nascimento", prof.call("login.php", {"matricula": "prof1", "senha": "1990-01-01"}), 200, must_set_password=True)
    check("me.php pede a senha", prof.call("me.php"), 200, user=None, must_set_password=True)
    check("sem senha não acessa a lista de alunos", prof.call("students.php?action=list"), 403, error="forbidden")
    check("senha curta é recusada", prof.call("set_password.php", {"password": "curta"}), 400, error="password_too_short")
    check("cria a senha", prof.call("set_password.php", {"password": "SenhaForte123"}), 200, ok=True, role="teacher")
    check("professor cadastra aluno", prof.call("register.php", {"matricula": "aluno1", "dob": "2008-05-12"}), 200, role="student")
    code, body = prof.call("students.php?action=list")
    pending = body.get("students", [{}])[0].get("must_set_password")
    check("lista mostra aluno aguardando 1º acesso", (code, {"pending": pending}), 200, pending=1)
    check("aluno entra com a data de nascimento", aluno.call("login.php", {"matricula": "aluno1", "senha": "2008-05-12"}), 200, must_set_password=True)
    check("sem senha não salva resultado", aluno.call("save_result.php", {"scenario": "x", "payload": {}}), 401, error="unauthorized")
    check("aluno cria a senha", aluno.call("set_password.php", {"password": "AlunoSenha1"}), 200, ok=True)
    check("aluno salva resultado", aluno.call("save_result.php", {"scenario": "ddos-basic", "payload": {"a": 1}}), 200, ok=True)
    check("cenário com HTML é recusado", aluno.call("save_result.php", {"scenario": "<img src=x onerror=alert(1)>", "payload": {}}), 400, error="invalid_scenario")
    check("cenário que não é texto é recusado", aluno.call("save_result.php", {"scenario": ["ddos-basic"], "payload": {}}), 400, error="invalid_scenario")
    check("criar senha fora do 1º acesso é negado", aluno.call("set_password.php", {"password": "OutraSenha9"}), 403, error="forbidden")
    aluno.call("logout.php", {})
    check("data de nascimento não serve mais", aluno.call("login.php", {"matricula": "aluno1", "senha": "2008-05-12"}), 401, error="invalid_credentials")
    check("aluno entra com a senha", aluno.call("login.php", {"matricula": "aluno1", "senha": "AlunoSenha1"}), 200, must_set_password=False)
    check("aluno não redefine senha", aluno.call("students.php?action=reset_password", {"id": 2}), 403, error="forbidden")
    check("professor redefine a senha do aluno", prof.call("students.php?action=reset_password", {"id": 2}), 200, ok=True)
    aluno.call("logout.php", {})
    check("senha antiga não serve mais", aluno.call("login.php", {"matricula": "aluno1", "senha": "AlunoSenha1"}), 401, error="invalid_credentials")
    check("volta a entrar com a data de nascimento", aluno.call("login.php", {"matricula": "aluno1", "senha": "2008-05-12"}), 200, must_set_password=True)
    check("não redefine senha de professor", prof.call("students.php?action=reset_password", {"id": 1}), 404, error="not_found")


def test_prazo_primeiro_professor(base, db):
    print("Prazo de 60 minutos para o 1º professor")

    def instalar_ha(minutos):
        if db.exists():
            db.unlink()
        Client(base).call("migrate.php")
        with sqlite3.connect(db) as conn:
            conn.execute("UPDATE settings SET value=datetime('now', ?) WHERE key='installed_at'", (f"-{minutos} minutes",))

    instalar_ha(59)
    check("aos 59 minutos ainda cadastra", Client(base).call("register.php", {"matricula": "p", "dob": "1990-01-01"}), 200, role="teacher")
    instalar_ha(61)
    check("aos 61 minutos é bloqueado", Client(base).call("register.php", {"matricula": "p", "dob": "1990-01-01"}), 403, error="setup_window_closed")
    Client(base).call("migrate.php")
    check("rodar a migração de novo não reabre o prazo", Client(base).call("register.php", {"matricula": "p", "dob": "1990-01-01"}), 403, error="setup_window_closed")


def test_banco_antigo(base, db):
    print("Banco criado por versão anterior (sem senha própria)")
    with sqlite3.connect(db) as conn:
        conn.executescript("""
            CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, matricula TEXT NOT NULL UNIQUE, dob TEXT NOT NULL,
                                password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT "student", created_at TEXT NOT NULL);
            CREATE TABLE results (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, scenario TEXT NOT NULL,
                                  payload TEXT NOT NULL, created_at TEXT NOT NULL,
                                  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
        """)
        for mat, dob, role in (("profA", "1985-03-03", "teacher"), ("alunoA", "2009-09-09", "student")):
            conn.execute("INSERT INTO users (matricula, dob, password_hash, role, created_at) VALUES (?,?,?,?,datetime('now'))",
                         (mat, dob, php_hash(f"{mat}|{dob}"), role))
    prof, aluno, legado = Client(base), Client(base), Client(base)
    check("professor entra com a data de nascimento", prof.call("login.php", {"matricula": "profA", "senha": "1985-03-03"}), 200, must_set_password=True)
    check("cria a senha", prof.call("set_password.php", {"password": "ProfSenha123"}), 200, ok=True)
    check("lista de alunos funciona", prof.call("students.php?action=list"), 200, ok=True)
    check("aluno entra com a data de nascimento", aluno.call("login.php", {"matricula": "alunoA", "senha": "2009-09-09"}), 200, must_set_password=True)
    check("interface antiga (campo dob) ainda entra", legado.call("login.php", {"matricula": "alunoA", "dob": "2009-09-09"}), 200, must_set_password=True)


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    tmp = Path(tempfile.mkdtemp(prefix="sim-labs-test-"))
    app = tmp / "app"
    shutil.copytree(ROOT, app, ignore=shutil.ignore_patterns(".git", "data", "tests"))
    (app / "data").mkdir()
    db = app / "data" / "app.sqlite"
    port = free_port()
    server = subprocess.Popen([PHP, "-S", f"127.0.0.1:{port}", "-t", str(app)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    base = f"http://127.0.0.1:{port}/api/"
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/index.php")
                break
            except OSError:
                time.sleep(0.1)
        for test in (test_fluxo_completo, test_prazo_primeiro_professor, test_banco_antigo):
            if db.exists():
                db.unlink()
            test(base, db)
    finally:
        server.terminate()
        _, err = server.communicate(timeout=5)
        shutil.rmtree(tmp, ignore_errors=True)
    # Só conta avisos do código do projeto (ignora os de inicialização do próprio PHP)
    php_errors = [l for l in err.splitlines()
                  if any(w in l for w in ("Fatal", "Warning", "Notice", "Deprecated")) and str(app) in l]
    for line in php_errors:
        print("  PHP:", line)
    total = failures + len(php_errors)
    print("TUDO OK" if total == 0 else f"{total} FALHA(S)")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
