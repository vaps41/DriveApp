import React, { useState, useEffect, useRef } from "react";
import HereMap from "./HereMap";
import { collection, addDoc, onSnapshot, doc, updateDoc, getDoc, query, where } from "firebase/firestore";
import logoImg from "./logo.png";
import { db } from "./firebase";

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const Icon = ({ d, size = 24, className = "", strokeWidth = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const icons = {
  navigation: "M3 11l19-9-9 19-2-8-8-2z", mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", clock: ["M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z", "M12 6v6l4 2"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"], chevronRight: "M9 18l6-6-6-6",
  alertCircle: ["M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z", "M12 8v4 M12 16h.01"], check: "M20 6 9 17l-5-5",
  logOut: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  lock: "M19 11H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  car: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.8l-1.4 2.1C1.5 10.4 1 11.1 1 12v4c0 .6.4 1 1 1h2 M7 17v2 M17 17v2 M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35", checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3"
};

const Ico = ({ name, size = 20, className = "", fill }) => {
  const d = icons[name]; if (!d) return null;
  return <Icon d={d} size={size} className={className} fill={fill || "none"} />;
};

const CATEGORIES = [
  { id: "moto", name: "Moto", emoji: "🏍️", bg: "#FEF3C7", basePrice: 12.50, providerCut: 10.00 },
  { id: "carroX", name: "Pop", emoji: "🚗", bg: "#DBEAFE", basePrice: 22.90, providerCut: 18.00 },
  { id: "premium", name: "Comfort", emoji: "🚙", bg: "#EDE9FE", basePrice: 35.00, providerCut: 28.00 },
];

const generatePIN = () => Math.floor(1000 + Math.random() * 9000).toString();
const formatCurrency = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const getAvatar = (name, role) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${role === 'client' ? '000000' : '2563eb'}`;

function Toast({ toast }) {
  if (!toast) return null;
  const isWarning = toast.type === "warning"; const isError = toast.type === "error";
  return (
    <div className={`absolute top-6 w-full flex justify-center z-[200] slide-down-fade`}>
      <div className={`w-[90%] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-semibold
        ${isError ? "bg-red-950 border-red-500 text-red-100" : isWarning ? "bg-amber-950 border-amber-500 text-amber-100" : "bg-slate-900 border-green-500 text-green-100"}`}>
        <span className="flex-shrink-0">{isError ? <Ico name="alertCircle" size={18} /> : isWarning ? "🔔" : "✅"}</span>
        <span className="break-words leading-tight">{toast.message}</span>
      </div>
    </div>
  );
}

function ResponsiveFrame({ children }) {
  return (
    <div className="w-full min-h-screen bg-slate-900 flex justify-center md:items-center">
      <div className="w-full h-[100dvh] md:h-[760px] md:w-[380px] bg-white md:rounded-[44px] shadow-2xl relative overflow-hidden flex flex-col md:border-[8px] border-slate-800">
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-3xl z-[100]" />
        {children}
      </div>
    </div>
  );
}

function StarRating({ value, onChange, size = 36 }) {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button type="button" key={star} onClick={() => onChange && onChange(star)} className="focus:outline-none transition-transform active:scale-90">
          <Ico name="star" size={size} className={`${star <= value ? 'text-yellow-400' : 'text-slate-200'} transition-colors`} fill={star <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function AuthScreen({ role, onBack, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", address: "", category: "", vehicle: "", plate: "" });
  
  const [realLocation, setRealLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState("A ler GPS...");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setRealLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus("Sinal GPS Ativo 📍"); },
        (err) => setGeoStatus("Sinal de GPS Oculto"), { enableHighAccuracy: true }
      );
    }
  }, []);

  const isClient = role === 'client';

  const handleSubmit = (e) => {
    e.preventDefault();
    let mockName = formData.name || formData.email.split('@')[0];
    let mockAddress = formData.address;
    let mockCategory = formData.category;
    let mockVehicle = formData.vehicle;
    let mockPlate = formData.plate || "ABC-1234";

    if (isLogin) {
      if (isClient) mockAddress = "Endereço via GPS";
      else { mockCategory = "carroX"; mockVehicle = "Chevrolet Onix 1.0"; }
    }

    const startGPS = realLocation || { lat: -23.6666, lng: -46.5322 };
    const endGPS = { lat: startGPS.lat + 0.015, lng: startGPS.lng + 0.015 };

    const newUser = {
      ...formData,
      name: mockName, address: mockAddress, category: mockCategory, vehicle: mockVehicle, plate: mockPlate,
      id: `usr_${Date.now()}`, role: role, avatar: getAvatar(mockName, role),
      startCoord: startGPS, endCoord: endGPS,
    };
    onAuthSuccess(newUser);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto no-scrollbar">
      <div className="px-5 pt-8 pb-4 flex items-center justify-between gap-3">
        <button onClick={onBack} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition"><Ico name="chevronRight" size={18} className="rotate-180 text-slate-700" /></button>
        <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-500 animate-pulse">{geoStatus}</span>
      </div>
      <div className="px-6 flex-1 flex flex-col">
        <h2 className="text-3xl font-black text-slate-800 mb-2">{isLogin ? "Bem-vindo de volta" : "Criar Conta"}</h2>
        <p className="text-slate-500 text-sm mb-8">{isClient ? "Aceda para solicitar corridas." : "Aceda para conduzir e ganhar dinheiro."}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
          {!isLogin && (
            <div className="relative">
              <Ico name="user" size={20} className="absolute left-4 top-4 text-slate-400" />
              <input required type="text" placeholder="Nome completo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 focus:outline-none focus:border-black transition" />
            </div>
          )}
          <div className="relative">
            <Ico name="mail" size={20} className="absolute left-4 top-4 text-slate-400" />
            <input required type="email" placeholder="E-mail" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 focus:outline-none focus:border-black transition" />
          </div>
          <div className="relative">
            <Ico name="lock" size={20} className="absolute left-4 top-4 text-slate-400" />
            <input required type="password" placeholder="Senha" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 focus:outline-none focus:border-black transition" />
          </div>
          {!isLogin && !isClient && (
            <>
              <div className="relative">
                <Ico name="car" size={20} className="absolute left-4 top-4 text-slate-400" />
                <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-800 focus:outline-none focus:border-black transition appearance-none">
                  <option value="" disabled>Categoria do Veículo</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input required type="text" placeholder="Veículo (ex: Onix)" value={formData.vehicle} onChange={e => setFormData({ ...formData, vehicle: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-slate-800 focus:outline-none focus:border-black transition" />
                </div>
                <div className="relative w-1/3">
                  <input required type="text" placeholder="Placa" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-slate-800 focus:outline-none focus:border-black transition text-center uppercase" />
                </div>
              </div>
            </>
          )}
          <button type="submit" className={`w-full mt-4 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform text-lg ${isClient ? 'bg-black' : 'bg-blue-600 shadow-blue-200'}`}>
            Entrar no Sistema
          </button>
        </form>
        <div className="mt-auto pb-8 text-center">
          <p className="text-slate-500 text-sm">{isLogin ? "Ainda não tem conta?" : "Já possui conta?"}</p>
          <button onClick={() => setIsLogin(!isLogin)} className={`font-black mt-1 ${isClient ? 'text-black' : 'text-blue-600'}`}>{isLogin ? "Registar agora" : "Fazer Login"}</button>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onSelectRole }) {
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white p-8 justify-center h-full">
      <div className="flex justify-center mb-8"><img src={logoImg} alt="App Logo" className="h-24 object-contain drop-shadow-2xl" /></div>
      <h1 className="text-3xl font-black text-center mb-2">DriveApp</h1>
      <p className="text-slate-400 text-center mb-12">Como deseja utilizar o aplicativo?</p>
      <button onClick={() => onSelectRole('client')} className="bg-white text-black font-extrabold py-4 rounded-2xl mb-4 active:scale-95 transition text-lg flex items-center justify-center gap-2">
        <Ico name="user" size={20} /> Sou Passageiro
      </button>
      <button onClick={() => onSelectRole('provider')} className="bg-blue-600 text-white font-extrabold py-4 rounded-2xl active:scale-95 transition text-lg shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2">
        <Ico name="car" size={20} /> Sou Motorista
      </button>
    </div>
  );
}

function InAppCheckout({ amount, orderId, onPaymentSuccess, onCancel }) {
  const stripe = useStripe(); const elements = useElements();
  const [isLoading, setIsLoading] = useState(false); const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsLoading(true); setErrorMessage("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements, confirmParams: { return_url: `${window.location.origin}/?order_id=${orderId}` }, redirect: "if_required",
    });
    if (error) { setErrorMessage(error.message); setIsLoading(false); } 
    else if (paymentIntent && paymentIntent.status === 'requires_capture') onPaymentSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col pt-6 pb-8 px-5 no-scrollbar h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={onCancel} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition shrink-0"><Ico name="chevronRight" size={18} className="rotate-180 text-slate-700" /></button>
        <h2 className="text-xl font-black text-slate-800">Pagamento da Corrida</h2>
      </div>
      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl mb-6 flex justify-between items-center shadow-inner">
        <span className="text-sm font-bold text-slate-500">Total a Pagar:</span>
        <span className="text-2xl font-black text-black">{formatCurrency(amount)}</span>
      </div>
      <div className="flex-1 pb-6">
        <PaymentElement options={{ layout: "tabs" }} />
        {errorMessage && <div className="mt-4 text-sm text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{errorMessage}</div>}
      </div>
      <button disabled={isLoading || !stripe || !elements} className="w-full bg-black text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition mt-auto flex justify-center items-center gap-2 text-lg disabled:bg-slate-400">
        {isLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : "Confirmar e Chamar"}
      </button>
    </form>
  );
}

function ClientApp({ user, onLogOut }) {
  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem('client_order') || null);
  const [orderData, setOrderData] = useState(null);
  const [destinationStr, setDestinationStr] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [screen, setScreen] = useState("home");
  const [rating, setRating] = useState(5); const [comment, setComment] = useState("");
  const [routeInfo, setRouteInfo] = useState({ distanceKm: '--', timeMin: '--' });
  const [clientSecret, setClientSecret] = useState(() => localStorage.getItem('client_secret') || "");

  const [toast, setToast] = useState(null); const toastTimer = useRef(null);
  const showToast = (message, type = "success") => { setToast({ message, type }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (activeOrderId) localStorage.setItem('client_order', activeOrderId); else localStorage.removeItem('client_order');
    if (clientSecret) localStorage.setItem('client_secret', clientSecret); else localStorage.removeItem('client_secret');
  }, [activeOrderId, clientSecret]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect_status') === 'succeeded' && params.get('order_id')) {
      updateDoc(doc(db, "pedidos", params.get('order_id')), { status: 'searching' });
      setActiveOrderId(params.get('order_id')); setScreen('searching'); setClientSecret("");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!activeOrderId) return;
    const unsub = onSnapshot(doc(db, "pedidos", activeOrderId), (documento) => {
      if (documento.exists()) {
        const data = documento.data(); setOrderData({ id: documento.id, ...data });
        if (data.status === "pending_payment") setScreen("payment");
        else if (data.status === "searching") setScreen("searching");
        else if (["accepted", "en_route", "arrived", "in_trip", "finishing"].includes(data.status)) setScreen("active");
        else if (data.status === "awaiting_rating" || data.status === "completed") setScreen("rate");
        else if (data.status === "cancelled") { showToast("A corrida foi cancelada.", "warning"); setActiveOrderId(null); setOrderData(null); setScreen("home"); setClientSecret(""); }
      }
    });
    return () => unsub();
  }, [activeOrderId]);

  const handleSearchRide = (e) => { e.preventDefault(); if(destinationStr.length > 3) setScreen("selecting"); };

  const handleRequest = async () => {
    if (!selectedCategory) return;
    const pin = generatePIN();
    try {
      showToast("A gerar ambiente seguro...", "info");
      const docRef = await addDoc(collection(db, "pedidos"), {
        status: 'pending_payment', category: selectedCategory, categoryId: selectedCategory.id,
        destination: destinationStr, client: user, pin: pin, provider: null, createdAt: new Date().toISOString()
      });
      const res = await fetch('/api/create-payment-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: selectedCategory.basePrice, orderId: docRef.id }) });
      if (!res.ok) throw new Error("Erro no pagamento");
      const data = await res.json();
      if (data.clientSecret) {
        await updateDoc(docRef, { paymentIntentId: data.paymentIntentId });
        setActiveOrderId(docRef.id); setClientSecret(data.clientSecret); setScreen("payment"); 
      }
    } catch (e) { showToast("Erro ao processar o seu pedido.", "error"); }
  };

  const handleCancel = async () => {
    if (activeOrderId) await updateDoc(doc(db, "pedidos", activeOrderId), { status: 'cancelled' });
    setActiveOrderId(null); setOrderData(null); setScreen("home"); setSelectedCategory(null); setClientSecret(""); setDestinationStr("");
  };

  const handleRate = async () => {
    if (activeOrderId) await updateDoc(doc(db, "pedidos", activeOrderId), { review: { id: Date.now(), rating, comment, customerName: user.name, avatar: user.avatar } });
    showToast("Avaliação enviada! Obrigado.", "success");
    setActiveOrderId(null); setOrderData(null); setScreen("home"); setSelectedCategory(null); setRating(5); setComment(""); setDestinationStr("");
  };

  if (screen === "home") return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto no-scrollbar relative">
      <Toast toast={toast} />
      <div className="absolute inset-0 z-0 opacity-40">
        <HereMap apikey={import.meta.env.VITE_HERE_API_KEY} startCoord={user.startCoord} endCoord={user.startCoord} />
      </div>
      <div className="relative z-10 flex flex-col h-full">
        <div className="px-5 pt-10 pb-3 flex justify-between items-center bg-white/80 backdrop-blur shadow-sm rounded-b-3xl">
          <div className="flex items-center gap-3">
            <img src={user.avatar} className="w-12 h-12 rounded-full border shadow-sm object-cover bg-slate-100" alt="" />
            <div><h1 className="text-lg font-black text-slate-800">{user.name}</h1><p className="text-xs text-slate-500 font-semibold flex items-center gap-1"><Ico name="mapPin" size={12}/> Onde você está</p></div>
          </div>
          <button onClick={onLogOut} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"><Ico name="logOut" size={18} /></button>
        </div>
        <div className="px-5 mt-auto mb-10">
          <form onSubmit={handleSearchRide} className="bg-white p-6 rounded-[32px] shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 mb-4">Para onde vamos?</h2>
            <div className="relative mb-4">
              <Ico name="search" size={20} className="absolute left-4 top-4 text-black" />
              <input required type="text" placeholder="Insira o seu destino..." value={destinationStr} onChange={e => setDestinationStr(e.target.value)} className="w-full bg-slate-100 rounded-2xl py-4 pl-12 pr-4 text-black font-semibold focus:outline-none focus:ring-2 focus:ring-black transition" />
            </div>
            <button type="submit" disabled={destinationStr.length < 3} className="w-full bg-black disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-transform text-lg active:scale-95">Procurar Viagem</button>
          </form>
        </div>
      </div>
    </div>
  );

  if (screen === "selecting") return (
    <div className="flex-1 flex flex-col bg-slate-50 pt-10 no-scrollbar">
      <Toast toast={toast} />
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => setScreen("home")} className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center active:scale-90 transition"><Ico name="chevronRight" size={18} className="rotate-180 text-slate-700" /></button>
        <h2 className="text-xl font-black text-slate-800">Escolha um Veículo</h2>
      </div>
      <div className="flex-1 px-5 flex flex-col gap-3 mt-4 overflow-y-auto pb-6 no-scrollbar">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setSelectedCategory(c)} className={`p-4 bg-white rounded-3xl border-2 transition-all flex items-center gap-4 ${selectedCategory?.id === c.id ? 'border-black shadow-md' : 'border-transparent shadow-sm'}`}>
            <span className="text-4xl bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center">{c.emoji}</span>
            <div className="flex-1 text-left">
              <h3 className="font-black text-slate-800 text-lg">{c.name}</h3><p className="text-xs text-slate-400 font-semibold flex items-center gap-1"><Ico name="user" size={12}/> 1-4 pessoas</p>
            </div>
            <span className="font-black text-lg">{formatCurrency(c.basePrice)}</span>
          </button>
        ))}
      </div>
      <div className="px-5 pb-8 bg-white pt-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button disabled={!selectedCategory} onClick={handleRequest} className="w-full bg-black disabled:bg-slate-300 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform text-lg">Confirmar {selectedCategory?.name}</button>
      </div>
    </div>
  );

  if (screen === "payment" && clientSecret) {
    const appearance = { theme: 'stripe', variables: { colorPrimary: '#000000', borderRadius: '16px' } };
    return (
      <div className="flex-1 flex flex-col bg-white h-full relative z-50">
        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <InAppCheckout amount={selectedCategory?.basePrice} orderId={activeOrderId} onCancel={handleCancel}
            onPaymentSuccess={async () => { await updateDoc(doc(db, "pedidos", activeOrderId), { status: 'searching' }); setScreen("searching"); setClientSecret(""); }} />
        </Elements>
      </div>
    );
  }

  if (screen === "searching") return (
    <div className="flex-1 flex flex-col items-center justify-between bg-black pt-10 pb-10 px-6">
      <Toast toast={toast} />
      <div className="text-center mt-20">
        <div className="relative w-28 h-28 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-slate-700 animate-ping" />
          <div className="w-28 h-28 bg-slate-800 rounded-full flex items-center justify-center text-4xl shadow-xl">{orderData?.category?.emoji || selectedCategory?.emoji || "🚗"}</div>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Conectando...</h2>
        <p className="text-slate-400 text-sm">Buscando os melhores motoristas próximos</p>
      </div>
      <button onClick={handleCancel} className="w-full text-slate-300 font-bold py-4 rounded-2xl hover:bg-slate-900 transition text-base border border-slate-700">Cancelar Pedido</button>
    </div>
  );

  if (screen === "active" && orderData) {
    const pro = orderData.provider;
    
    // 📍 O PASSAGEIRO RECEBE A SIMULAÇÃO (ESPELHO DO MOTORISTA)
    const isGoingToPassenger = ["accepted", "en_route"].includes(orderData.status);
    const mapStartCoord = isGoingToPassenger ? pro.startCoord : orderData.client.startCoord;
    const mapEndCoord = isGoingToPassenger ? orderData.client.startCoord : orderData.client.endCoord;
    
    const isSimulating = orderData.status === "en_route" || orderData.status === "in_trip";

    const titleText = {
      "accepted": "Motorista Encontrado", "en_route": "Motorista a Caminho", 
      "arrived": "Motorista no Local", "in_trip": "Em Viagem", "finishing": "Chegou ao Destino!"
    }[orderData.status];

    return (
      <div className="flex-1 flex flex-col h-full bg-slate-100 relative">
        <Toast toast={toast} />
        <div className="h-[50%] relative bg-slate-200 overflow-hidden">
          <HereMap apikey={import.meta.env.VITE_HERE_API_KEY} startCoord={mapStartCoord} endCoord={mapEndCoord} isSimulating={isSimulating} onRouteCalculated={setRouteInfo} />
          {isSimulating && (
             <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black px-6 py-2 rounded-full shadow-xl text-xs font-black text-white whitespace-nowrap flex items-center gap-2 z-10">
               <Ico name="clock" size={14} className="text-white" /> Estimativa: {routeInfo.timeMin} min
             </div>
          )}
        </div>

        <div className="bg-white rounded-t-[32px] -mt-5 z-20 flex-1 flex flex-col p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-y-auto no-scrollbar">
          <h3 className="font-black text-center text-lg mb-4">{titleText}</h3>
          
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <img src={pro.avatar} className="w-14 h-14 rounded-full border object-cover bg-slate-200" alt="" />
            <div className="flex-1">
              <p className="font-black text-slate-800 text-lg">{pro.name}</p>
              <p className="text-xs font-bold text-slate-500">{pro.vehicle} • <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded uppercase">{pro.plate}</span></p>
            </div>
            <div className="text-3xl">{orderData.category.emoji}</div>
          </div>

          {orderData.status === "finishing" ? (
            <div className="bg-slate-900 rounded-3xl p-6 text-center shadow-lg">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Seu PIN de Segurança</p>
              <div className="flex justify-center gap-2">
                {orderData.pin?.split("").map((digit, i) => (
                  <div key={i} className="w-12 h-14 bg-white rounded-xl flex items-center justify-center text-2xl font-black text-black shadow-inner">{digit}</div>
                ))}
              </div>
            </div>
          ) : (
             <div className="bg-slate-50 rounded-2xl border p-4">
               <p className="text-xs text-slate-400 font-bold uppercase mb-1">Destino Final</p>
               <p className="text-sm font-bold text-slate-800">{orderData.destination}</p>
             </div>
          )}

          <div className="flex-1" />
          {["accepted", "en_route"].includes(orderData.status) && (
            <button onClick={handleCancel} className="mt-4 w-full py-4 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition border border-red-100">Cancelar Corrida</button>
          )}
        </div>
      </div>
    );
  }

  if (screen === "rate") {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 items-center justify-between px-6 pb-8 pt-12 overflow-y-auto no-scrollbar">
        <Toast toast={toast} />
        <div className="text-center w-full">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 bg-slate-200"><img src={orderData?.provider?.avatar} className="w-full h-full object-cover" alt="" /></div>
          <h2 className="text-2xl font-black text-slate-800 mb-1">Chegou ao destino!</h2><p className="text-sm text-slate-500">Como foi a viagem com {orderData?.provider?.name}?</p>
        </div>
        <div className="w-full space-y-6 my-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <StarRating value={rating} onChange={setRating} />
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Elogie o motorista (opcional)..." rows={3} className="w-full border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 resize-none focus:outline-none focus:border-black bg-slate-50" />
        </div>
        <button onClick={handleRate} className="w-full bg-black text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform text-lg">Enviar Avaliação</button>
      </div>
    );
  }
  return null;
}

function ProviderApp({ user, onLogOut }) {
  const [providerStatus, setProviderStatus] = useState(() => localStorage.getItem('pro_status') || "offline");
  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem('pro_order') || null);
  
  const [availableOrders, setAvailableOrders] = useState([]);
  const [ignoredOrders, setIgnoredOrders] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ distanceKm: '--', timeMin: '--' });
  const [earnings, setEarnings] = useState(0); const [reviews, setReviews] = useState([]);

  const [toast, setToast] = useState(null); const toastTimer = useRef(null);
  const showToast = (message, type = "success") => { setToast({ message, type }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3500); };

  useEffect(() => { localStorage.setItem('pro_status', providerStatus); }, [providerStatus]);
  useEffect(() => { if (activeOrderId) localStorage.setItem('pro_order', activeOrderId); else localStorage.removeItem('pro_order'); }, [activeOrderId]);

  useEffect(() => {
    if (providerStatus !== 'online') { setAvailableOrders([]); return; }
    const q = query(collection(db, "pedidos"), where("status", "==", "searching"));
    const unsub = onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach(doc => { if (doc.data().category.id === user.category) orders.push({ id: doc.id, ...doc.data() }); });
      setAvailableOrders(orders);
    });
    return () => unsub();
  }, [providerStatus, user.category]);

  useEffect(() => {
    if (!activeOrderId) return;
    const unsub = onSnapshot(doc(db, "pedidos", activeOrderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data(); setOrderData({ id: docSnap.id, ...data });
        if (data.status === 'cancelled') { showToast("O passageiro cancelou a corrida.", "error"); setActiveOrderId(null); setOrderData(null); }
        else if (data.status === 'completed') {
          setEarnings(e => e + data.category.providerCut);
          if (data.review) setReviews(r => [data.review, ...r]);
          showToast(`Viagem Concluída! Ganho de ${formatCurrency(data.category.providerCut)}`, "success");
          setActiveOrderId(null); setOrderData(null);
        }
      }
    });
    return () => unsub();
  }, [activeOrderId]);

  const handleAccept = async (orderToAccept) => {
    try {
      const orderRef = doc(db, "pedidos", orderToAccept.id); const snap = await getDoc(orderRef);
      if (snap.exists() && snap.data().status === 'searching') {
        await updateDoc(orderRef, { status: 'accepted', provider: user });
        setActiveOrderId(orderToAccept.id); showToast("Corrida aceita! Siga para o embarque.", "success");
      } else { showToast("Esta corrida já não está disponível.", "error"); setIgnoredOrders(prev => [...prev, orderToAccept.id]); }
    } catch (e) { showToast("Erro ao aceitar corrida", "error"); }
  };

  const handleUpdateStatus = async (newStatus, msg) => { await updateDoc(doc(db, "pedidos", activeOrderId), { status: newStatus }); if (msg) showToast(msg, "success"); };

  if (providerStatus === "offline") return (
    <div className="flex-1 flex flex-col bg-slate-50 pt-10 px-6 overflow-y-auto no-scrollbar pb-8">
      <Toast toast={toast} />
      <div className="pb-6 flex items-center justify-between">
        <button onClick={onLogOut} className="p-2 bg-white rounded-full shadow-sm text-slate-500 border border-slate-100"><Ico name="logOut" size={18} /></button>
        <div className="flex items-center gap-2 bg-slate-200 px-3 py-1.5 rounded-full"><div className="w-2 h-2 bg-slate-400 rounded-full" /><span className="text-xs font-bold text-slate-500">Offline</span></div>
      </div>
      <div className="flex items-center gap-4 mb-6">
        <img src={user.avatar} className="w-16 h-16 rounded-full shadow-md object-cover bg-blue-100" alt="" />
        <div><h2 className="text-xl font-black text-slate-800">{user.name}</h2><p className="text-sm text-slate-500 capitalize">{user.vehicle} • {user.plate}</p></div>
      </div>
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-[32px] p-6 mb-6 text-white shadow-lg">
        <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Ganhos de hoje</p><p className="text-4xl font-black">{formatCurrency(earnings)}</p>
        <div className="mt-6 flex gap-3">
          <div className="bg-white/10 rounded-2xl p-3 text-center flex-1 backdrop-blur-sm"><p className="text-xs text-blue-200">Corridas</p><p className="font-black text-lg">{reviews.length}</p></div>
          <div className="bg-white/10 rounded-2xl p-3 text-center flex-1 backdrop-blur-sm"><p className="text-xs text-blue-200">Avaliação</p><p className="font-black text-lg flex items-center justify-center gap-1">{reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "5.0"} <Ico name="star" size={16} className="text-yellow-400 fill-current" /></p></div>
        </div>
      </div>
      <button onClick={() => { setProviderStatus("online"); showToast("🟢 Você está online!", "success"); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg transition text-lg active:scale-95 mb-8">Ficar Online / Iniciar Turno</button>
    </div>
  );

  if (providerStatus === "online" && (!orderData || orderData.status === "awaiting_rating")) {
    const currentIncomingOrder = availableOrders.find(o => !ignoredOrders.includes(o.id));

    if (currentIncomingOrder && !orderData) {
      return (
        <div className="flex-1 flex flex-col h-full bg-slate-900 pt-10">
          <Toast toast={toast} />
          <div className="h-1/3 flex items-center justify-center relative"><div className="w-8 h-8 bg-blue-500 rounded-full animate-ping" /></div>
          <div className="bg-white rounded-t-[44px] flex-1 flex flex-col p-6 relative shadow-[0_-20px_50px_rgba(37,99,235,0.3)]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow"><span className="animate-bounce">🔔</span> Nova Solicitação!</div>
            <div className="text-center mt-6 mb-6">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Ganhos Estimados</p><p className="text-5xl font-black text-green-600">{formatCurrency(currentIncomingOrder.category?.providerCut)}</p>
            </div>
            <div className="bg-slate-50 rounded-3xl border border-slate-100 p-5 mb-6">
              <div className="flex items-start gap-3 text-sm text-slate-600 mb-4 border-b border-slate-200 pb-4"><div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5"><Ico name="user" size={14} className="text-slate-600"/></div><div><p className="text-xs font-bold text-slate-400">Embarque</p><span className="font-bold text-slate-800">Passageiro no local do GPS</span></div></div>
              <div className="flex items-start gap-3 text-sm text-slate-600"><div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Ico name="mapPin" size={14} className="text-blue-600"/></div><div><p className="text-xs font-bold text-slate-400">Destino</p><span className="font-bold text-slate-800">{currentIncomingOrder.destination}</span></div></div>
            </div>
            <div className="flex gap-3 mt-auto">
              <button onClick={() => setIgnoredOrders(prev => [...prev, currentIncomingOrder.id])} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl active:scale-95 transition">Recusar</button>
              <button onClick={() => handleAccept(currentIncomingOrder)} className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl active:scale-95 transition shadow-lg shadow-blue-200 text-lg">Aceitar Corrida</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-between bg-slate-900 pt-10 pb-8 px-6">
        <Toast toast={toast} />
        <div className="text-center mt-20">
          <div className="relative w-32 h-32 mx-auto mb-8"><div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" /><div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)]"><Ico name="car" size={40} className="text-white" fill="white" /></div></div>
          <h2 className="text-2xl font-black text-white mb-2">Procurando Corridas</h2><p className="text-slate-400 text-sm">Você está online e visível para passageiros.</p>
        </div>
        <button onClick={() => setProviderStatus("offline")} className="w-full bg-slate-800 text-slate-300 border border-slate-700 py-4 rounded-2xl font-bold text-base active:scale-95">Ficar Offline</button>
      </div>
    );
  }

  // 📍 A SIMULAÇÃO VISUAL DO MOTORISTA
  const isGoingToPassenger = ["accepted", "en_route"].includes(orderData?.status);
  const mapStartCoord = isGoingToPassenger ? user.startCoord : orderData?.client.startCoord;
  const mapEndCoord = isGoingToPassenger ? orderData?.client.startCoord : orderData?.client.endCoord;
  
  const isSimulating = orderData?.status === "en_route" || orderData?.status === "in_trip";

  if (orderData && orderData.status !== "finishing") return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 relative">
        <Toast toast={toast} />
        <div className="bg-white px-6 pt-5 pb-5 flex items-center gap-3 z-20 shadow-sm border-b">
          <div className="flex-1">
            <h2 className="text-lg font-black mb-1">{orderData.status === 'accepted' ? 'Siga para o embarque' : orderData.status === 'en_route' ? 'A caminho do Passageiro' : 'Em Viagem'}</h2>
            <p className="text-xs text-slate-500 font-bold truncate">Destino: {orderData.destination}</p>
          </div>
        </div>
        
        <div className="flex-1 relative overflow-hidden bg-slate-200">
          <HereMap 
            apikey={import.meta.env.VITE_HERE_API_KEY} 
            startCoord={mapStartCoord} 
            endCoord={mapEndCoord} 
            isSimulating={isSimulating}
            onSimulationDone={() => {
              // 📍 Avanço de Status Automático (O DEEP DEBUG 1 garante que não trava aqui)
              if (orderData.status === "en_route") handleUpdateStatus("arrived", "Chegou ao local de embarque.");
              else if (orderData.status === "in_trip") handleUpdateStatus("finishing", "Chegou ao Destino Final!");
            }}
            onRouteCalculated={setRouteInfo} 
          />
        </div>
        
        <div className="bg-white rounded-t-[32px] -mt-6 z-20 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
           <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
              <img src={orderData.client.avatar} className="w-12 h-12 rounded-full border bg-slate-100" alt="" />
              <div><p className="font-black text-slate-800">{orderData.client.name}</p><p className="text-xs text-slate-500">Distância da rota: {routeInfo.distanceKm} km</p></div>
           </div>
           
           {orderData.status === 'accepted' && (
             <button onClick={() => handleUpdateStatus('en_route')} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex justify-center text-lg active:scale-95">Iniciar Deslocamento (Simular)</button>
           )}
           {orderData.status === 'en_route' && (
             <button disabled className="w-full bg-slate-300 text-slate-500 font-black py-4 rounded-2xl flex justify-center text-lg">Dirigindo até ao Cliente...</button>
           )}
           {orderData.status === 'arrived' && (
             <button onClick={() => handleUpdateStatus('in_trip')} className="w-full bg-black text-white font-black py-4 rounded-2xl flex justify-center text-lg active:scale-95">Iniciar Viagem (Simular)</button>
           )}
           {orderData.status === 'in_trip' && (
             <button disabled className="w-full bg-slate-300 text-slate-500 font-black py-4 rounded-2xl flex justify-center text-lg">Em Viagem...</button>
           )}
        </div>
    </div>
  );

  if (orderData?.status === "finishing") return (
    <div className="flex-1 flex flex-col bg-slate-50 pt-10 px-6 justify-between pb-8">
      <Toast toast={toast} />
      <div className="text-center mt-8">
        <h2 className="text-3xl font-black text-slate-800 mb-2">Viagem Encerrada</h2>
        <p className="text-slate-500">Peça o código de 4 dígitos ao passageiro para liberar o seu pagamento de {formatCurrency(orderData.category?.providerCut)}.</p>
      </div>
      <div className="bg-white p-8 rounded-[32px] shadow-sm mt-8 mb-auto border">
        <PINInput pin={orderData.pin} price={orderData.category?.providerCut} onConfirm={async (p) => {
          if (p === orderData.pin) {
            showToast("A processar pagamento...", "success");
            try {
              const res = await fetch('/api/capture-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId: orderData.paymentIntentId }) });
              if (!res.ok) throw new Error("Falha na operadora."); const data = await res.json();
              if (data.success) handleUpdateStatus('completed', "Pagamento recebido!");
            } catch (e) { showToast("Falha ao comunicar com o banco.", "error"); }
          }
        }} />
      </div>
    </div>
  );

  return null;
}

function PINInput({ pin, onConfirm, price }) {
  const [input, setInput] = useState(["", "", "", ""]); const [status, setStatus] = useState(null); const inputRefs = useRef([]);
  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...input]; next[i] = val; setInput(next); setStatus(null);
    if (val && i < 3) inputRefs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => { if (e.key === "Backspace" && !input[i] && i > 0) inputRefs.current[i - 1]?.focus(); };
  const handleConfirm = () => {
    const code = input.join("");
    if (code === pin) { setStatus("success"); onConfirm(code); } 
    else { setStatus("error"); setInput(["", "", "", ""]); inputRefs.current[0]?.focus(); }
  };
  return (
    <div>
      <div className="flex justify-center gap-3 mb-6">
        {input.map((v, i) => (
          <input key={i} ref={(el) => (inputRefs.current[i] = el)} value={v} maxLength={1} inputMode="numeric" onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
            className={`w-14 h-16 text-center text-3xl font-black rounded-2xl border-2 outline-none transition shadow-inner ${status === "error" ? "border-red-400 bg-red-50 text-red-600" : status === "success" ? "border-green-400 bg-green-50 text-green-600" : "border-slate-200 bg-slate-50 focus:border-blue-500"}`} />
        ))}
      </div>
      <button onClick={handleConfirm} disabled={!input.every(d => d)} className={`w-full py-4 rounded-2xl font-black text-lg transition active:scale-95 ${input.every(d => d) ? "bg-black text-white" : "bg-slate-200 text-slate-400"}`}>Confirmar Recebimento</button>
    </div>
  );
}

export default function App() {
  const [activeUser, setActiveUser] = useState(() => { try { const saved = localStorage.getItem('app_user'); return (saved && saved !== "undefined") ? JSON.parse(saved) : null; } catch (e) { return null; } });
  const [role, setRole] = useState(() => {
    let savedRole = localStorage.getItem('app_role'); if (savedRole === "undefined") savedRole = null;
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('redirect_status')) savedRole = 'client'; return savedRole;
  });
  const [authRole, setAuthRole] = useState(null);

  useEffect(() => { if (role) localStorage.setItem('app_role', role); else localStorage.removeItem('app_role'); }, [role]);
  useEffect(() => { if (activeUser) localStorage.setItem('app_user', JSON.stringify(activeUser)); else localStorage.removeItem('app_user'); }, [activeUser]);

  const handleLogout = () => { localStorage.clear(); setRole(null); setActiveUser(null); setAuthRole(null); };
  const isSystemReady = role && activeUser;

  return (
    <div className="bg-slate-900 min-h-screen font-sans">
      <ResponsiveFrame>
        {!isSystemReady && !authRole && <WelcomeScreen onSelectRole={setAuthRole} />}
        {!isSystemReady && authRole && <AuthScreen role={authRole} onBack={() => setAuthRole(null)} onAuthSuccess={(u) => { setActiveUser(u); setRole(authRole); }} />}
        {isSystemReady && role === 'client' && <ClientApp user={activeUser} onLogOut={handleLogout} />}
        {isSystemReady && role === 'provider' && <ProviderApp user={activeUser} onLogOut={handleLogout} />}
      </ResponsiveFrame>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .slide-down-fade { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        * { -webkit-tap-highlight-color: transparent; }
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}