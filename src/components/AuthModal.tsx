import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Key, Eye, EyeOff, ShieldAlert, Sparkles, ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string }) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "verify-reset">("login");
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  
  // Visual states
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulated verification code state
  const [generatedCode, setGeneratedCode] = useState("");

  // Initialize pre-configured account
  useEffect(() => {
    const savedUsers = localStorage.getItem("nepse_ai_registered_users");
    if (!savedUsers) {
      const defaultUsers = [
        {
          name: "Gyan Shahi",
          email: "shahigyan181@gmail.com",
          password: "password123",
        }
      ];
      localStorage.setItem("nepse_ai_registered_users", JSON.stringify(defaultUsers));
    }
  }, []);

  if (!isOpen) return null;

  const getRegisteredUsers = (): any[] => {
    try {
      const usersStr = localStorage.getItem("nepse_ai_registered_users");
      return usersStr ? JSON.parse(usersStr) : [];
    } catch {
      return [];
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const users = getRegisteredUsers();
      const matchedUser = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (matchedUser) {
        setSuccessMsg(`Welcome back, ${matchedUser.name}!`);
        localStorage.setItem("nepse_ai_logged_user", JSON.stringify({
          name: matchedUser.name,
          email: matchedUser.email,
        }));
        
        setTimeout(() => {
          onLoginSuccess({ name: matchedUser.name, email: matchedUser.email });
          onClose();
          setIsLoading(false);
        }, 1000);
      } else {
        setErrorMsg("Invalid email address or password. Please try again.");
        setIsLoading(false);
      }
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name || !email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const users = getRegisteredUsers();
      const userExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());

      if (userExists) {
        setErrorMsg("An account with this email already exists.");
        setIsLoading(false);
        return;
      }

      // Add new user
      const updatedUsers = [...users, { name, email, password }];
      localStorage.setItem("nepse_ai_registered_users", JSON.stringify(updatedUsers));
      
      setSuccessMsg("Account registered successfully! Logging you in...");
      localStorage.setItem("nepse_ai_logged_user", JSON.stringify({ name, email }));

      setTimeout(() => {
        onLoginSuccess({ name, email });
        onClose();
        setIsLoading(false);
      }, 1000);
    }, 900);
  };

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const users = getRegisteredUsers();
      const userExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());

      if (!userExists) {
        setErrorMsg("No account found with this email address.");
        setIsLoading(false);
        return;
      }

      // Generate a 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setMode("verify-reset");
      setSuccessMsg(`Reset code sent to ${email}.`);
      setIsLoading(false);
    }, 800);
  };

  const handleVerifyAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!resetCode) {
      setErrorMsg("Please enter the verification code.");
      return;
    }

    if (resetCode !== generatedCode) {
      setErrorMsg("Incorrect verification code. Please check the code above.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const users = getRegisteredUsers();
      const updatedUsers = users.map((u) => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u, password: newPassword };
        }
        return u;
      });

      localStorage.setItem("nepse_ai_registered_users", JSON.stringify(updatedUsers));
      setSuccessMsg("Password reset successful! Please log in with your new password.");
      
      setTimeout(() => {
        setMode("login");
        setPassword("");
        setNewPassword("");
        setResetCode("");
        setSuccessMsg("");
        setIsLoading(false);
      }, 1500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]">
        {/* Close button (optional bypass) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-800/60 rounded-full transition-colors cursor-pointer z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand Banner */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 text-center space-y-2 border-b border-slate-850">
          <div className="w-12 h-12 bg-indigo-950 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-950/40">
            <svg className="h-6 w-6 text-indigo-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 3v2h2v2h-2v2h-2V7H9V5h2V3h2zm4 4v2h2v2h-2v2h-2v-2h2V9h-2V7h2zM5 13v2H3v2h2v2h2v-2H5v-2h2v-2H5zm4 4v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2z" />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold tracking-wider uppercase text-white">
            NEPSE<span className="text-indigo-500">AI</span> Accounts
          </h2>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
            Gain unified access to LSTM charts, price predictors, sentiment roll indices, and personalized portfolio ledger streams.
          </p>
        </div>

        {/* Content Box */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Notification Alerts */}
          {errorMsg && (
            <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-in slide-in-from-top-2 duration-200">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs animate-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Verification Code Cheat Helper - Professional touch so they know what code is generated */}
          {mode === "verify-reset" && generatedCode && (
            <div className="bg-indigo-950/40 border border-indigo-900/40 p-3.5 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">System Code Delivery Simulator</span>
              <div className="text-lg font-mono font-bold text-white tracking-widest">{generatedCode}</div>
              <p className="text-[10px] text-slate-400">Enter this verification code below to authorize your password update.</p>
            </div>
          )}

          {/* STATE 1: LOGIN (SIGN IN) */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-3.5">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. shahigyan181@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-3 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wide transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-10 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Authenticating Account..." : "Sign In to Platform"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              {/* Direct Quick-Fill Credentials Helper to make checking a breeze */}
              <div className="bg-slate-950/40 border border-slate-850/60 p-3 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Demo Login Helper:</span>
                <div className="flex flex-col gap-1 text-[10px] text-slate-400 leading-tight">
                  <div>Email: <strong className="text-slate-300 font-mono">shahigyan181@gmail.com</strong></div>
                  <div>Password: <strong className="text-slate-300 font-mono">password123</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("shahigyan181@gmail.com");
                    setPassword("password123");
                  }}
                  className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider block mt-1 cursor-pointer"
                >
                  ⚡ Auto Fill Credentials
                </button>
              </div>

              {/* Switch to Registration */}
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                >
                  Sign Up Free
                </button>
              </div>
            </form>
          )}

          {/* STATE 2: REGISTRATION (SIGN UP) */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-3.5">
                {/* Full Name Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gyan Shahi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-3 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-3 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Choose Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-10 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Creating Profile..." : "Create Account"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              {/* Switch to Login */}
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* STATE 3: FORGOT PASSWORD */}
          {mode === "forgot" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-left text-[11px] text-slate-300 leading-relaxed space-y-1">
                <div className="font-bold text-indigo-400">Password Recovery Routine</div>
                <p>Provide your email address. If the email exists in our records, we will output a validation recovery code to reset your account credentials.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. shahigyan181@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-3 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Generating Reset Key..." : "Send Reset Code"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </form>
          )}

          {/* STATE 4: VERIFY RESET & WRITE NEW PASSWORD */}
          {mode === "verify-reset" && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              <div className="space-y-3.5">
                {/* 6 digit code input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enter 6-Digit Code</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-3 py-3 focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center"
                    />
                  </div>
                </div>

                {/* New Password input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Choose New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 rounded-xl pl-9.5 pr-10 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Updating Credentials..." : "Reset Password & Login"}
                {!isLoading && <CheckCircle2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setErrorMsg("");
                  setSuccessMsg("");
                  setResetCode("");
                  setNewPassword("");
                }}
                className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Resend Reset Code
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/60 p-4 text-center border-t border-slate-850 text-[10px] text-slate-500">
          🔒 Secure TLS 256-bit encrypted simulated portal
        </div>
      </div>
    </div>
  );
}
