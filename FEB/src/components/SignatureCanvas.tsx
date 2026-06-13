import React, { useRef, useEffect, useState } from "react";
import SignatureCanvasPkg from "react-signature-canvas";
import { Upload, RotateCcw, Check, X } from "lucide-react";

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
  initialSignature?: string;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  onCancel,
  initialSignature,
}) => {
  const canvasRef = useRef<SignatureCanvasPkg>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 200 });
  const [isSigned, setIsSigned] = useState(!!initialSignature);

  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.getCanvas()?.parentElement;
      if (container) {
        const containerWidth = container.clientWidth;
        const width = Math.min(containerWidth - 40, 500);
        const height = Math.max(width * 0.4, 150);
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    if (initialSignature && canvasRef.current) {
      canvasRef.current.fromDataURL(initialSignature);
      setIsSigned(true);
    }
  }, [initialSignature]);

  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) {
      const handleDraw = () => setIsSigned(true);
      canvas.addEventListener("mouseup", handleDraw);
      canvas.addEventListener("touchend", handleDraw);
      return () => {
        canvas.removeEventListener("mouseup", handleDraw);
        canvas.removeEventListener("touchend", handleDraw);
      };
    }
  }, []);

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      setIsSigned(false);
    }
  };

  const handleSave = () => {
    if (!isSigned) {
      alert("Veuillez signer avant de sauvegarder");
      return;
    }
    if (canvasRef.current) {
      const signatureData = canvasRef.current.toDataURL();
      onSave(signatureData);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      if (canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current?.getCanvas();
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Calculate scaling to fit image in canvas
              const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
              );

              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              const x = (canvas.width - scaledWidth) / 2;
              const y = (canvas.height - scaledHeight) / 2;

              ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
              setIsSigned(true);
            }
          }
        };
        img.src = imageData;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Signature électronique
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Canvas Container */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex flex-col items-center">
                <SignatureCanvasPkg
                  ref={canvasRef}
                  canvasProps={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                    className:
                      "signature-canvas bg-white border border-gray-200 rounded",
                  }}
                  backgroundColor="white"
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Signez dans la zone ci-dessus ou importez une image de
                  signature
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importer une image
              </button>

              <button
                onClick={handleClear}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Effacer
              </button>
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                Sauvegarder
              </button>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default SignatureCanvas;
