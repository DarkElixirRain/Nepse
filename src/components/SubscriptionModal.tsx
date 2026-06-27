import React, { useState } from "react";
import { 
  Check, 
  ShieldCheck, 
  X, 
  BadgeAlert, 
  Star, 
  Sparkles, 
  CreditCard, 
  ChevronRight,
  Copy,
  QrCode,
  ExternalLink,
  CheckCircle2,
  Info
} from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

export default function SubscriptionModal({ isOpen, onClose, onSubscribe }: SubscriptionModalProps) {
  const [step, setStep] = useState<"compare" | "payment" | "success">("compare");
  const [paymentMethod, setPaymentMethod] = useState<"esewa" | "khalti" | "card">("esewa");
  
  // eSewa specific states
  const [esewaMode, setEsewaMode] = useState<"epay" | "direct">("epay");
  const [isSandbox, setIsSandbox] = useState<boolean>(true); // Sandbox by default for safe test, toggle for production
  const [directTxCode, setDirectTxCode] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Wallet / Card simulation fallbacks
  const [mobileNumber, setMobileNumber] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleStartPayment = () => {
    setStep("payment");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText("9742973182");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Live eSewa ePay Integration handler
  const handleInitiateEsewaEpay = async () => {
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/esewa/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: "1499",
          origin: window.location.origin,
          isSandbox: isSandbox
        })
      });

      if (!res.ok) {
        throw new Error("Failed to sign payment payload from server.");
      }

      const params = await res.json();
      console.log("eSewa Form Parameters Loaded:", params);

      // Create a programmatic HTML Form POST submission targeting eSewa official portal
      const form = document.createElement("form");
      form.setAttribute("method", "POST");
      form.setAttribute("action", params.gateway_url);

      const fields = [
        "amount",
        "tax_amount",
        "total_amount",
        "transaction_uuid",
        "product_code",
        "product_service_charge",
        "product_delivery_charge",
        "success_url",
        "failure_url",
        "signed_field_names",
        "signature"
      ];

      fields.forEach((key) => {
        const input = document.createElement("input");
        input.setAttribute("type", "hidden");
        input.setAttribute("name", key);
        input.setAttribute("value", params[key]);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      console.log("Submitting programmatic eSewa EPAY transaction...");
      form.submit();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("eSewa initialization failed: " + (err.message || "Internal error"));
      setLoading(false);
    }
  };

  // 2. Direct transfer instant verification handler
  const handleVerifyDirectQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!directTxCode || directTxCode.length < 5) {
      setErrorMsg("Please enter a valid Transaction ID / Reference Code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/subscription/direct-activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          txCode: directTxCode,
          amount: "1499"
        })
      });

      if (res.ok) {
        setLoading(false);
        setStep("success");
        setTimeout(() => {
          onSubscribe();
          setStep("compare");
          setDirectTxCode("");
          onClose();
        }, 2200);
      } else {
        throw new Error("Reference verification declined.");
      }
    } catch (err: any) {
      setErrorMsg("Verification failed. Please contact support or retry.");
      setLoading(false);
    }
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (paymentMethod === "esewa") {
      if (esewaMode === "epay") {
        handleInitiateEsewaEpay();
      }
      return;
    }

    // Process general simulated fallback for Khalti and Card
    if (paymentMethod === "khalti") {
      if (!mobileNumber.startsWith("98") || mobileNumber.length !== 10) {
        setErrorMsg("Please enter a valid Nepalese mobile number starting with 98 (10 digits).");
        return;
      }
      if (pinCode.length < 4) {
        setErrorMsg("Please enter a valid 4-digit PIN.");
        return;
      }
    } else {
      if (cardNumber.replace(/\s+/g, "").length < 16) {
        setErrorMsg("Please enter a valid 16-digit card number.");
        return;
      }
      if (!cardExpiry.includes("/")) {
        setErrorMsg("Please enter card expiry in MM/YY format.");
        return;
      }
      if (cardCvc.length < 3) {
        setErrorMsg("Please enter 3-digit CVC/CVV.");
        return;
      }
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("success");
      setTimeout(() => {
        onSubscribe();
        setStep("compare");
        setMobileNumber("");
        setPinCode("");
        setCardNumber("");
        setCardExpiry("");
        setCardCvc("");
        onClose();
      }, 1800);
    }, 1500);
  };

  const freeFeatures = [
    "Standard ARIMA Market Models",
    "7-Day forecast projection horizon",
    "1 Active price trigger alert rule",
    "Standard Technical Indicator overlays",
    "Standard NEPSE AI Chatbot",
  ];

  const proFeatures = [
    "Advanced LSTM Neural Networks",
    "Extended 1, 2, 3, 7, 30 & 90 Days forecast horizons",
    "Unlimited price threshold alerts (Real-time checks)",
    "Deep-dive AI Strategic Stock Reports",
    "AI News Sentiment macro analyzer audits",
    "24/7 dedicated finance advisor agent",
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-full transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-4 sm:p-6 border-b border-slate-800 text-center space-y-1 sm:space-y-2 flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-950 border border-indigo-500 rounded-xl flex items-center justify-center text-indigo-400 mx-auto">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 uppercase tracking-wider">Upgrade to NEPSE AI Premium</h2>
          <p className="text-[10px] sm:text-xs text-slate-400 max-w-sm mx-auto">
            Unlock advanced machine learning algorithms, deep neural network projections, and real-time alert trigger guards.
          </p>
        </div>

        {/* Comparison grid */}
        {step === "compare" && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Free Plan */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Free Core</h4>
                    <div className="text-lg font-bold text-slate-300 mt-1">Rs 0</div>
                    <div className="text-[10px] text-slate-500">Standard basic features</div>
                  </div>
                  <div className="space-y-2 border-t border-slate-850/50 pt-3">
                    {freeFeatures.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] text-slate-400">
                        <Check className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Premium Plan */}
              <div className="bg-indigo-950/20 border-2 border-indigo-500/60 p-4 rounded-xl space-y-4 relative flex flex-col justify-between">
                <span className="absolute -top-3 right-4 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  POPULAR
                </span>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Premium</h4>
                    <div className="text-lg font-bold text-white mt-1">
                      Rs 1,499 <span className="text-xs font-normal text-slate-400">/ mo</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Cancel or switch at any time</div>
                  </div>
                  <div className="space-y-2 border-t border-indigo-900/40 pt-3">
                    {proFeatures.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] text-slate-200">
                        <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onClose}
                className="w-full sm:w-1/3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold py-3 rounded-lg transition-colors cursor-pointer text-center"
              >
                Continue Free
              </button>
              <button
                onClick={handleStartPayment}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold py-3 rounded-lg shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Proceed to Payment (Rs 1,499)
              </button>
            </div>
          </div>
        )}

        {/* Payment screen step */}
        {step === "payment" && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            <div>
              <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Nepalese Payment Method</h3>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {/* eSewa */}
                <button
                  type="button"
                  onClick={() => { setPaymentMethod("esewa"); setErrorMsg(""); }}
                  className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === "esewa"
                      ? "bg-emerald-950/40 border-emerald-500 text-emerald-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wide">eSewa</span>
                  <span className="text-[7px] sm:text-[8px] mt-0.5 opacity-80">Instant Transfer</span>
                </button>

                {/* Khalti */}
                <button
                  type="button"
                  onClick={() => { setPaymentMethod("khalti"); setErrorMsg(""); }}
                  className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === "khalti"
                      ? "bg-indigo-950/40 border-indigo-500 text-indigo-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wide">Khalti</span>
                  <span className="text-[7px] sm:text-[8px] mt-0.5 opacity-80">Digital Wallet</span>
                </button>

                {/* Card */}
                <button
                  type="button"
                  onClick={() => { setPaymentMethod("card"); setErrorMsg(""); }}
                  className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === "card"
                      ? "bg-slate-900 border-slate-700 text-slate-100"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[9px] sm:text-[10px] font-bold">Debit/Card</span>
                </button>
              </div>
            </div>

            {/* Dynamic input forms */}
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
              <div className="flex justify-between items-center text-xs font-semibold pb-2 border-b border-slate-850/50">
                <span className="text-slate-400">Order: NEPSE AI Monthly Premium</span>
                <span className="text-indigo-400 font-mono font-bold">NPR 1,499.00</span>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-950/50 border border-rose-900 text-rose-400 text-[11px] rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* eSewa options layout */}
              {paymentMethod === "esewa" && (
                <div className="space-y-4">
                  {/* Sub-tab choice */}
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEsewaMode("epay")}
                      className={`text-[10px] py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                        esewaMode === "epay"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      ePay Web Gateway
                    </button>
                    <button
                      type="button"
                      onClick={() => setEsewaMode("direct")}
                      className={`text-[10px] py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                        esewaMode === "direct"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Direct QR Transfer
                    </button>
                  </div>

                  {esewaMode === "epay" ? (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <Info className="w-3.5 h-3.5" />
                          <span>Official eSewa Gateway Portal</span>
                        </div>
                        <p>
                          You will be securely redirected to eSewa's live ePay v2 system to execute your transaction.
                        </p>
                      </div>

                      {/* Sandbox Toggle */}
                      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 uppercase block">Sandbox Demo Mode</label>
                          <span className="text-[9px] text-slate-500">Toggle off for actual real-world fund transfer</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSandbox(!isSandbox)}
                          className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                            isSandbox ? "bg-indigo-600 flex justify-end" : "bg-slate-700 flex justify-start"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white block transition-all" />
                        </button>
                      </div>

                      <div className="pt-2 text-center text-[10px] text-slate-500">
                        Merchant ID: <span className="text-slate-300 font-mono font-bold">{isSandbox ? "Sandbox (EPAYTEST)" : "9742973182"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1 flex flex-col items-center">
                      <div className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-left text-[11px] text-slate-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">Transfer to Personal Wallet</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/40 font-bold uppercase">Rs 1,499.00</span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-850 font-mono text-xs">
                          <span className="text-white">eSewa ID: <strong>9742973182</strong></span>
                          <button
                            type="button"
                            onClick={copyToClipboard}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-sans text-[10px]"
                          >
                            <Copy className="w-3 h-3" />
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Breathtaking styled eSewa personal QR card */}
                      <div className="bg-white p-3 rounded-xl shadow-xl flex flex-col items-center border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=9742973182&color=059669`}
                          alt="eSewa Pay QR"
                          className="w-40 h-40 object-contain"
                        />
                        <span className="text-[9px] font-bold text-slate-500 mt-1.5 uppercase font-sans tracking-wide">Scan with eSewa Mobile App</span>
                      </div>

                      {/* Transaction input form */}
                      <div className="w-full space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Enter eSewa Transaction Reference Code
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 5G8Y7T or numeric reference"
                            value={directTxCode}
                            onChange={(e) => setDirectTxCode(e.target.value)}
                            className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-mono text-center uppercase tracking-widest"
                          />
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleVerifyDirectQR}
                          disabled={loading}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {loading ? "Activating Premium..." : "Verify Code & Activate Instantly"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Khalti form */}
              {paymentMethod === "khalti" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Khalti ID (Mobile Number)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 98XXXXXXXX"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Secure Wallet PIN (4 digits)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="****"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Credit/Debit Card form */}
              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Card Number</label>
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="4123 4567 8901 2345"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/[^\d ]/g, ""))}
                      className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expiry Date</label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CVC / CVV</label>
                      <input
                        type="password"
                        maxLength={3}
                        placeholder="***"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                        className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <form onSubmit={handleProcessPayment} className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep("compare")}
                className="w-1/3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold py-3 rounded-lg transition-colors cursor-pointer text-center"
              >
                Back
              </button>
              
              {/* Render dynamic payment submit buttons except for direct QR mode which has its own verification action */}
              {!(paymentMethod === "esewa" && esewaMode === "direct") && (
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 text-white text-xs font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === "esewa"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20"
                      : paymentMethod === "khalti"
                      ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/20"
                      : "bg-slate-100 text-slate-950 hover:bg-white"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      Processing secure payment...
                    </span>
                  ) : (
                    `Pay NPR 1,499 via ${paymentMethod === "esewa" ? "eSewa Portal" : paymentMethod === "khalti" ? "Khalti" : "Card"}`
                  )}
                </button>
              )}
            </form>
          </div>
        )}

        {/* Success screen step */}
        {step === "success" && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-950 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Upgrade Authorized Successfully!</h3>
            <p className="text-xs text-slate-400">
              Welcome to NEPSE AI Premium. Deep learning models and neural projection weights have been initialized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
