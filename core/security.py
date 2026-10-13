"""Cabecalhos de seguranca, ProxyFix e teto de upload (regime WEB, sem login nem sessao)."""
from werkzeug.middleware.proxy_fix import ProxyFix

CSP = (
    "default-src 'self'; "
    "img-src 'self' data: https:; "
    "style-src 'self' 'unsafe-inline'; "
    "font-src 'self'; "
    "script-src 'self'"
)


def init_security(app):
    # x_for=1: um unico proxy confiavel na frente (Traefik do EasyPanel)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # teto global; 5 MB por arquivo vem na Fase 4

    @app.after_request
    def _headers(resp):
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "SAMEORIGIN"
        resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        resp.headers["Content-Security-Policy"] = CSP
        return resp
