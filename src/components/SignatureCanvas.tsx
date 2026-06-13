import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignatureCanvasProps {
  onSave: (signature: string | null) => void;
  initialSignature?: string | null;
}

const SignatureComponent: React.FC<SignatureCanvasProps> = ({
  onSave,
  initialSignature,
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageURL, setImageURL] = useState<string | null>(
    initialSignature || null
  );
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 300 });

  // Configuration responsive du canvas
  useEffect(() => {
    const updateCanvasSize = () => {
      const containerWidth = Math.min(window.innerWidth * 0.9, 800);
      setCanvasSize({
        width: containerWidth,
        height: 300,
      });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Configuration précise du canvas
  useEffect(() => {
    if (sigCanvas.current) {
      const canvas = sigCanvas.current.getCanvas();
      const ctx = canvas.getContext("2d");

      // Vérification que ctx n'est pas null
      if (ctx) {
        // Configuration HD
        const scale = window.devicePixelRatio || 1;
        canvas.width = canvasSize.width * scale;
        canvas.height = canvasSize.height * scale;
        ctx.scale(scale, scale);

        // Réglages de précision
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [canvasSize]);

  const clear = () => {
    sigCanvas.current?.clear();
    setImageURL(null);
    onSave(null);
  };

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataURL = sigCanvas.current
        .getTrimmedCanvas()
        .toDataURL("image/png");
      setImageURL(dataURL);
      onSave(dataURL);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataURL = event.target?.result as string;
        if (sigCanvas.current) {
          sigCanvas.current.fromDataURL(dataURL, {
            width: canvasSize.width,
            height: canvasSize.height,
            callback: () => {
              save();
              if (fileInputRef.current) fileInputRef.current.value = "";
            },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="signature-container p-4 bg-white rounded-lg shadow-md">
      <div className="canvas-wrapper border-2 border-dashed border-gray-200 rounded-lg overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#000000"
          backgroundColor="#ffffff"
          velocityFilterWeight={0.5}
          minWidth={1.5}
          maxWidth={2.5}
          dotSize={1}
          throttle={2}
          canvasProps={{
            width: canvasSize.width,
            height: canvasSize.height,
            style: {
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              touchAction: "none",
              cursor: "crosshair",
            },
          }}
        />
      </div>

      <div className="controls flex gap-2 mt-4">
        <button
          onClick={clear}
          className="flex-1 px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
        >
          Effacer
        </button>
        <button
          onClick={handleImport}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
        >
          Importer
        </button>
        <button
          type="button"
          onClick={save}
          className="flex-1 px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
        >
          Valider
        </button>
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {imageURL && (
        <div className="preview mt-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600 mb-2">Aperçu :</p>
          <img
            src={imageURL}
            alt="Signature"
            className="mx-auto border border-gray-200"
            style={{ maxHeight: "80px" }}
          />
        </div>
      )}
    </div>
  );
};

export default SignatureComponent;
