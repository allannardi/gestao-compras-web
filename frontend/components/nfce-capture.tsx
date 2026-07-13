"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type CaptureState = "idle" | "camera" | "processing" | "result" | "error";

type NfceItem = {
  descricao_original: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
};

type NfcePreview = {
  ok: boolean;
  mensagem: string;
  qr_texto: string;
  chave_nfce: string;
  mercado_nome: string;
  cnpj: string;
  data_compra: string;
  valor_total: number;
  forma_pagamento: string;
  valor_pago: number;
  itens: NfceItem[];
  html_obtido: boolean;
};

type Props = {
  apiUrl: string;
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function getErrorMessage(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  return "Não foi possível processar a imagem da NFC-e.";
}

export function NfceCapture({ apiUrl }: Props) {
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<NfcePreview | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
    setCameraReady(false);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (state !== "camera" || !cameraStream || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    let cancelled = false;

    video.srcObject = cameraStream;
    video.muted = true;
    video.playsInline = true;

    const startPlayback = async () => {
      try {
        await video.play();
      } catch {
        if (!cancelled) {
          setError(
            "A câmera foi autorizada, mas a imagem não iniciou. Tente novamente ou use uma foto.",
          );
        }
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      void startPlayback();
    } else {
      video.addEventListener("loadedmetadata", startPlayback, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", startPlayback);

      if (video.srcObject === cameraStream) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [cameraStream, state]);

  const startCamera = async () => {
    setError("");
    setPreview(null);
    setCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }

    stopCamera();
    setState("camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (stream.getVideoTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Nenhuma câmera de vídeo foi encontrada.");
      }

      streamRef.current = stream;
      setCameraStream(stream);
    } catch (cameraError) {
      stopCamera();
      setState("error");
      setError(
        cameraError instanceof Error && cameraError.message
          ? `Não consegui abrir a câmera: ${cameraError.message}`
          : "Não consegui abrir a câmera. Autorize o acesso no navegador ou use uma foto já tirada.",
      );
    }
  };

  const sendImage = async (file: File | Blob, filename: string) => {
    stopCamera();
    setState("processing");
    setError("");
    setPreview(null);

    const formData = new FormData();
    formData.append("file", file, filename);

    try {
      const response = await fetch(
        `${normalizeApiUrl(apiUrl)}/api/v1/nfce/preview`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      setPreview(payload as NfcePreview);
      setState("result");
    } catch (requestError) {
      setState("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível consultar a NFC-e.",
      );
    }
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!cameraReady || !video || !video.videoWidth || !video.videoHeight) {
      setError("A câmera ainda está iniciando. Aguarde um instante e tente novamente.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Não consegui capturar a imagem da câmera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );

    if (!blob) {
      setError("Não consegui preparar a imagem para leitura.");
      return;
    }

    await sendImage(blob, "nfce-camera.jpg");
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    await sendImage(file, file.name || "nfce-foto.jpg");
  };

  const reset = () => {
    stopCamera();
    setState("idle");
    setError("");
    setPreview(null);
  };

  return (
    <section className="capture-section" aria-label="Leitura de NFC-e">
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFile}
      />

      {state === "idle" && (
        <div className="capture-actions">
          <button className="primary-action" type="button" onClick={startCamera}>
            <span>Ler QR-CODE da NF</span>
            <small>Abrir a câmera e consultar a NFC-e</small>
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Usar uma foto já tirada
          </button>
          <p className="privacy-note">Nesta fase, nenhuma compra será gravada.</p>
        </div>
      )}

      {state === "camera" && (
        <div className="camera-card">
          <div className="camera-copy">
            <strong>Enquadre o QR Code</strong>
            <span>Evite reflexos e mantenha o código inteiro visível.</span>
          </div>
          <div className="video-frame">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              onPlaying={() => {
                setCameraReady(true);
                setError("");
              }}
            />
            {!cameraReady && (
              <div className="camera-loading" role="status" aria-live="polite">
                <span className="spinner" aria-hidden="true" />
                <strong>Iniciando câmera…</strong>
              </div>
            )}
            <div className="qr-guide" aria-hidden="true" />
          </div>
          {error && <p className="inline-error">{error}</p>}
          <div className="button-row">
            <button className="ghost-action" type="button" onClick={reset}>
              Cancelar
            </button>
            <button
              className="capture-button"
              type="button"
              onClick={captureFrame}
              disabled={!cameraReady}
            >
              {cameraReady ? "Capturar QR Code" : "Aguardando câmera"}
            </button>
          </div>
        </div>
      )}

      {state === "processing" && (
        <div className="processing-card" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Lendo o QR Code</strong>
            <p>Consultando os dados públicos da NFC-e…</p>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="feedback-card error-card" role="alert">
          <strong>Não foi possível concluir a leitura</strong>
          <p>{error}</p>
          <div className="button-row">
            <button className="ghost-action" type="button" onClick={reset}>
              Voltar
            </button>
            <button
              className="capture-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Tentar com uma foto
            </button>
          </div>
        </div>
      )}

      {state === "result" && preview && (
        <div className="preview-stack">
          <div className={`feedback-card ${preview.ok ? "success-card" : "warning-card"}`}>
            <strong>{preview.ok ? "NFC-e localizada" : "QR Code lido"}</strong>
            <p>{preview.mensagem}</p>
          </div>

          <div className="summary-grid">
            <article className="summary-card summary-wide">
              <span>Supermercado</span>
              <strong>{preview.mercado_nome || "Não identificado"}</strong>
              {preview.cnpj && <small>CNPJ {preview.cnpj}</small>}
            </article>
            <article className="summary-card">
              <span>Data</span>
              <strong>{preview.data_compra || "—"}</strong>
            </article>
            <article className="summary-card">
              <span>Valor total</span>
              <strong>{moneyFormatter.format(preview.valor_total || 0)}</strong>
            </article>
            <article className="summary-card summary-wide">
              <span>Pagamento</span>
              <strong>{preview.forma_pagamento || "Não identificado"}</strong>
            </article>
          </div>

          <div className="items-header">
            <div>
              <p className="eyebrow">Conferência</p>
              <h2>Itens da compra</h2>
            </div>
            <span>{preview.itens.length} itens</span>
          </div>

          {preview.itens.length > 0 ? (
            <div className="items-list">
              {preview.itens.map((item, index) => (
                <article
                  className="item-card"
                  key={`${item.descricao_original}-${item.valor_unitario}-${index}`}
                >
                  <strong>{item.descricao_original}</strong>
                  <div className="item-metrics">
                    <span>
                      <small>Qtd</small>
                      {numberFormatter.format(item.quantidade)}
                    </span>
                    <span>
                      <small>Un</small>
                      {item.unidade}
                    </span>
                    <span>
                      <small>Valor unit.</small>
                      {moneyFormatter.format(item.valor_unitario)}
                    </span>
                    <span className="item-total">
                      <small>Total</small>
                      {moneyFormatter.format(item.valor_total)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-card">
              O QR Code foi lido, mas o portal não devolveu os itens neste teste.
            </div>
          )}

          <div className="not-saved-card">
            <strong>Teste seguro</strong>
            <span>Nenhuma informação foi salva no Turso ou no PostgreSQL.</span>
          </div>

          <button className="secondary-action full-width" type="button" onClick={reset}>
            Ler outra NFC-e
          </button>
        </div>
      )}
    </section>
  );
}
