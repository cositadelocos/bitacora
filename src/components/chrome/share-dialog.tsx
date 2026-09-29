import { useEffect, useState } from "react";

export function ShareDialog({
  onClose,
  publishedNote = false,
}: {
  onClose: () => void;
  publishedNote?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const shareUrl = `${window.location.origin}/`;
    setUrl(shareUrl);
    let cancel = false;
    void import("qrcode")
      .then((mod) =>
        mod.toDataURL(shareUrl, {
          margin: 1,
          width: 320,
          color: { dark: "#2c2926", light: "#f1eed7" },
        }),
      )
      .then((data) => {
        if (!cancel) setQr(data);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "Bitácora", text: "Un cuaderno de proceso", url });
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="dialog-back" role="presentation" onMouseDown={onClose}>
      <div
        className="paper-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="share-title">Compartir</h2>
        <p className="dialog-copy">
          {publishedNote
            ? "El enlace abre la bitácora publicada. Quien lo reciba puede hojearla, no editarla."
            : "Cualquiera con el enlace puede ver el cuaderno publicado."}
        </p>
        <label className="field">
          <span>Enlace</span>
          <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
        </label>
        {qr ? <img className="qr" src={qr} alt="Código QR del enlace" /> : null}
        <div className="dialog-actions">
          <button type="button" className="ink-btn" onClick={() => void copy()}>
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>
          <button type="button" className="quiet-btn" onClick={() => void nativeShare()}>
            Compartir…
          </button>
          <button type="button" className="quiet-btn ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
