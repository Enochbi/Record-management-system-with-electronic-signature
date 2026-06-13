import React from "react";
import { format } from "date-fns";
import { FDP, PaymentMethod } from "../types";

interface PrintableFDPProps {
  data: FDP;
}

const PrintableFDP: React.FC<PrintableFDPProps> = ({ data }) => {
  const departments = [
    "Direction Générale",
    "Technique",
    "Commercial",
    "Opérations",
    "Comptabilité",
    "Administration",
    "Autres",
  ];

  const paymentMethods = [
    { id: PaymentMethod.VIREMENT,            label: "Virement bancaire" },
    { id: PaymentMethod.CHEQUE_BARRE,        label: "Chèque barré" },
    { id: PaymentMethod.CHEQUE_NON_BARRE,    label: "Chèque non barré" },
    { id: PaymentMethod.ESPECES,             label: "Espèces" },
    { id: PaymentMethod.MONNAIE_ELECTRONIQUE,label: "E-monnaie" },
    { id: PaymentMethod.AUTRE,               label: "Autre" },
  ];

  // 5 signatures actives (Opérations, Fournisseur et Trésorerie sont supprimés du workflow)
  const activeSignatures = [
    {
      title: "Demandeur",
      signature: data.requester_signature,
      date: data.requester_signature_date,
    },
    {
      title: "Sup. hiérarchique",
      signature: data.superieur_hierarchique_signature,
      date: data.superieur_hierarchique_signature_date,
    },
    {
      title: "Comptabilité",
      signature: data.comptabilite_signature,
      date: data.comptabilite_signature_date,
    },
    {
      title: "DG",
      signature: data.directeur_general_signature,
      date: data.directeur_general_signature_date,
    },
    {
      title: "Caisse",
      signature: data.caisse_signature,
      date: data.caisse_signature_date,
    },
  ];

  return (
    <div className="print-container w-[210mm] min-h-[297mm] bg-white p-4 text-black text-xs">
      {/* En-tête */}
      <div className="text-center mb-3">
        <h1 className="text-sm font-bold uppercase">Vipnet — Fiche de Dépense</h1>
        <p className="text-xs font-semibold mt-1">{data.type_description}</p>
        <p className="text-xs">
          Réf : {data.reference?.replace("TEMP-", "") || "Nouvelle"}
        </p>
      </div>

      {/* Informations demandeur + départements */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Colonne gauche */}
        <div className="border border-gray-300 p-1 space-y-1">
          <p className="text-xs">
            <span className="font-semibold">Date :</span>{" "}
            {data.creation_date
              ? format(new Date(data.creation_date), "dd/MM/yy")
              : "—"}
          </p>
          <p className="text-xs">
            <span className="font-semibold">Poste :</span>{" "}
            {data.requester_position}
          </p>
          <p className="text-xs">
            <span className="font-semibold">Nom :</span> {data.requester_name}
          </p>
        </div>

        {/* Colonne droite — départements */}
        <div className="border border-gray-300 p-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="h-5">
                <th className="text-left p-0.5">Service</th>
                <th className="w-5 text-center">D</th>
                <th className="w-5 text-center">R</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept} className="h-4">
                  <td className="p-0.5">{dept}</td>
                  <td className="text-center">
                    {data.department_source === dept ? "✓" : ""}
                  </td>
                  <td className="text-center">
                    {(data.department_destination || []).includes(dept)
                      ? "✓"
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description */}
      <div className="border border-gray-300 p-1 mb-2">
        <div className="flex justify-between mb-1">
          <p className="text-xs">
            <span className="font-semibold">Montant :</span>{" "}
            {data.amount != null ? `${data.amount} FCFA` : "—"}
          </p>
          <p className="text-xs">
            <span className="font-semibold">Réf paiement :</span>{" "}
            {data.payment_reference || "—"}
          </p>
        </div>
        <p className="font-semibold text-xs mb-0.5">Description</p>
        <p className="text-xs">{data.description}</p>
      </div>

      {/* Signatures — 5 champs actifs */}
      <div className="mb-2">
        <p className="text-center font-semibold text-xs mb-1">VALIDATION</p>
        <div className="grid grid-cols-5 gap-1">
          {activeSignatures.map(({ title, signature, date }) => (
            <SignatureBox
              key={title}
              title={title}
              signature={signature}
              date={date}
            />
          ))}
        </div>

        {/* Montant validé */}
        <div className="border border-gray-300 p-1 mt-1 text-center">
          <p className="font-semibold text-xs mb-0.5">Montant validé (DG)</p>
          <p className="text-sm font-bold">
            {data.validated_amount != null
              ? `${data.validated_amount} FCFA`
              : "—"}
          </p>
        </div>
      </div>

      {/* Mode de paiement */}
      <div>
        <p className="text-xs italic text-right mb-0.5">
          (réservé à la comptabilité)
        </p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="h-5">
              <th className="border border-gray-300 p-0.5 text-left">
                Paiement
              </th>
              <th className="border border-gray-300 p-0.5 w-6 text-center">
                ✓
              </th>
              <th className="border border-gray-300 p-0.5 text-left">Réf</th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((method) => (
              <tr key={method.id} className="h-4">
                <td className="border border-gray-300 p-0.5">{method.label}</td>
                <td className="border border-gray-300 p-0.5 text-center">
                  {data.payment_method === method.id ? "✓" : ""}
                </td>
                <td className="border border-gray-300 p-0.5">
                  {data.payment_method === method.id
                    ? data.payment_reference
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Boîte de signature pour l'impression ─────────────────────────────────────

const SignatureBox: React.FC<{
  title: string;
  signature: string | null | undefined;
  date: string | null | undefined;
}> = ({ title, signature, date }) => (
  <div className="border border-gray-300 p-0.5 h-16">
    <p className="font-semibold text-center text-xs mb-0.5">{title}</p>
    <div className="h-8 flex items-center justify-center">
      {signature ? (
        <img
          src={signature}
          alt="Signature"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="text-gray-300 text-xs">—</span>
      )}
    </div>
    {date && (
      <p className="text-center text-xs mt-0.5">
        {format(new Date(date), "dd/MM/yy")}
      </p>
    )}
  </div>
);

export default PrintableFDP;