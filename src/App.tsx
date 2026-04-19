/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { 
  ShieldCheck, 
  History, 
  LayoutDashboard, 
  Settings, 
  RotateCw, 
  HardHat, 
  Footprints, 
  Mic, 
  Send,
  User,
  AlertTriangle,
  CheckCircle2,
  Construction,
  Search,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateReplacementDate, validateCPF, formatCPF } from './lib/epiEngine';
import { parseDeliveryInput, ExtractedDelivery } from './lib/gemini';
import { DeliveryRecord } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string | ReactNode }[]>([
    { role: 'assistant', content: 'Bem-vindo ao motor lógico do EPI Guard. Como posso ajudar com os registros de segurança hoje?' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleProcessInput = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isProcessing) return;

    const input = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsProcessing(true);

    if (input.toLowerCase().includes('status do sistema')) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'O banco de dados está sincronizado e operando em modo "Cloud-Sync", pronto para uso offline se necessário.' 
      }]);
      setIsProcessing(false);
      return;
    }

    try {
      const extracted = await parseDeliveryInput(input);
      
      if (extracted.status === 'incomplete' || !extracted.workerName || !extracted.workerCPF || !extracted.epi) {
        let missing = [];
        if (!extracted.workerName) missing.push('Nome');
        if (!extracted.workerCPF) missing.push('CPF');
        if (!extracted.epi) missing.push('Tipo de EPI');
        
        const responseMsg = missing.length > 0 
          ? `Entendi sua solicitação, mas para prosseguir eu preciso que você informe: ${missing.join(', ')}.`
          : 'Não consegui identificar todos os dados. Por favor, detalhe melhor a entrega.';
          
        setMessages(prev => [...prev, { role: 'assistant', content: responseMsg }]);
      } else {
        // Data is complete, validate CPF
        if (!validateCPF(extracted.workerCPF)) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '⚠️ Erro: CPF inválido. Por favor, verifique os números e tente novamente.' 
          }]);
        } else {
          try {
            const deliveryDate = extracted.deliveryDate || format(new Date(), 'yyyy-MM-dd');
            const nextReplacement = calculateReplacementDate(deliveryDate, extracted.epi);

            const newRecord: DeliveryRecord = {
              id: crypto.randomUUID(),
              workerName: extracted.workerName,
              workerCPF: formatCPF(extracted.workerCPF),
              epi: extracted.epi,
              deliveryDate,
              nextReplacementDate: nextReplacement,
              timestamp: Date.now()
            };

            setRecords(prev => [newRecord, ...prev]);

            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: (
                <div className="space-y-2 text-sm md:text-base">
                  <p className="font-bold text-emerald-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Registro realizado com sucesso!
                  </p>
                  <div className="bg-white/50 p-3 rounded border border-emerald-100 space-y-1">
                    <p>👤 <strong>Colaborador:</strong> {newRecord.workerName} (CPF: {newRecord.workerCPF})</p>
                    <p>🛠️ <strong>Equipamento:</strong> {newRecord.epi}</p>
                    <p>📅 <strong>Data de Entrega:</strong> {format(parseISO(newRecord.deliveryDate), 'dd/MM/yyyy')}</p>
                    <p>⚠️ <strong>Próxima Troca:</strong> {format(parseISO(newRecord.nextReplacementDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <p className="text-xs text-stone-500 italic">💡 Dica de UX: Este alerta já foi enviado para o dashboard de conformidade.</p>
                </div>
              )
            }]);
          } catch (err: any) {
            if (err.message === 'EPI_NOT_FOUND') {
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Este item (${extracted.epi}) não está no meu banco de dados padrão. Qual é a vida útil recomendada pelo fabricante para este EPI?` 
              }]);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro ao calcular a validade. Poderia tentar novamente?' }]);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um problema técnico para processar essa informação agora.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col font-sans selection:bg-[#ffb599] selection:text-[#370e00]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#fcf9f8]/80 backdrop-blur-md border-b-2 border-[#eae7e7]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[#a63b00]" />
            <h1 className="text-xl font-black uppercase tracking-tighter text-[#1b1c1c]">EPI Guard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#f0eded] rounded-full border border-[#e5e2e1]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5b4137]">Cloud-Sync Ativo</span>
            </div>
            <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-[#a63b00]">
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 p-4 md:p-6 mb-20 md:mb-0">
        
        {/* Main Content Area */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="EPIs Hoje" value={records.filter(r => r.deliveryDate === format(new Date(), 'yyyy-MM-dd')).length.toString()} trend="+15%" icon={<Construction />} color="orange" />
                <StatCard label="Vencendo Logo" value="3" icon={<AlertTriangle />} color="blue" />
                <StatCard label="Críticos" value="1" icon={<AlertTriangle />} color="red" />
                <StatCard label="Equipe" value="42" icon={<User />} color="stone" />
              </div>

              {/* Action Prompt */}
              <div className="bg-[#a63b00] p-6 rounded-2xl shadow-xl shadow-[#a63b00]/20 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Novo Registro</h3>
                <p className="text-white/80 font-medium mb-4">Use o console inteligente ao lado para registrar entregas por voz ou texto.</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounde-sm">
                    Sincronização Cloud
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounde-sm">
                    Criptografia ISO
                  </span>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-[#eae7e7] overflow-hidden">
                <div className="px-6 py-4 flex justify-between items-center bg-[#f6f3f2] border-b border-[#eae7e7]">
                  <h4 className="font-black uppercase tracking-widest text-xs text-[#5b4137]">Atividade Recente</h4>
                  <button onClick={() => setActiveTab('history')} className="text-[10px] font-bold uppercase text-[#a63b00] hover:underline">Ver Histórico</button>
                </div>
                <div className="divide-y divide-[#eae7e7]">
                  {records.length > 0 ? (
                    records.slice(0, 5).map(record => (
                      <ActivityItem key={record.id} record={record} />
                    ))
                  ) : (
                    <div className="p-12 text-center space-y-2">
                      <LayoutDashboard className="w-12 h-12 text-stone-300 mx-auto" />
                      <p className="text-stone-400 font-medium tracking-tight">Nenhum registro recente encontrado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-[#eae7e7] overflow-hidden min-h-[600px]">
              <div className="px-6 py-4 bg-[#f6f3f2] border-b border-[#eae7e7]">
                <h4 className="font-black uppercase tracking-widest text-xs text-[#5b4137]">Histórico Completo</h4>
              </div>
              <div className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="p-4 text-[10px] font-black uppercase text-stone-500 tracking-widest">Colaborador</th>
                      <th className="p-4 text-[10px] font-black uppercase text-stone-500 tracking-widest">EPI</th>
                      <th className="p-4 text-[10px] font-black uppercase text-stone-500 tracking-widest">Entrega</th>
                      <th className="p-4 text-[10px] font-black uppercase text-stone-500 tracking-widest">Validade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {records.map(record => (
                      <tr key={record.id} className="hover:bg-stone-50 transition-colors cursor-default">
                        <td className="p-4">
                          <p className="font-bold text-sm text-stone-900">{record.workerName}</p>
                          <p className="text-[10px] text-stone-400 font-medium">CPF: {record.workerCPF}</p>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-tight",
                            record.epi.includes('Capacete') ? "bg-stone-100 text-stone-600" :
                            record.epi.includes('Botas') ? "bg-stone-100 text-stone-600" :
                            "bg-[#ffdbce] text-[#a63b00]"
                          )}>
                            {record.epi}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-stone-500">{format(parseISO(record.deliveryDate), 'dd/MM/yy')}</td>
                        <td className="p-4 text-sm font-black text-[#a63b00]">{format(parseISO(record.nextReplacementDate), 'dd/MM/yy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-[#eae7e7] p-8 space-y-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Configurações</h2>
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase text-stone-400 tracking-[0.2em] mb-4">Parâmetros de Validade</h4>
                  <div className="space-y-2">
                    <ConfigItem label="Capacete" value="3 Anos" />
                    <ConfigItem label="Botas de Segurança" value="6 Meses" />
                    <ConfigItem label="Luvas de Vaqueta" value="15 Dias" />
                    <ConfigItem label="Óculos de Proteção" value="90 Dias" />
                    <ConfigItem label="Protetor Auricular" value="30 Dias" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-stone-400 tracking-[0.2em] mb-4">Sincronização</h4>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-600">
                        <RotateCw className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">Cloud Sync Ativado</p>
                        <p className="text-xs text-stone-500">Última sincronização: Agora</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-emerald-500 rounded-full flex items-center px-1">
                      <div className="w-4 h-4 bg-white rounded-full translate-x-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Engine Console */}
        <aside className="fixed lg:relative bottom-0 left-0 w-full lg:w-auto z-40 lg:z-0 px-4 md:px-0 bg-[#fcf9f8] lg:bg-transparent pt-4 pb-20 lg:pt-0 lg:pb-0">
          <div className="bg-white rounded-2xl shadow-2xl lg:shadow-[0_20px_40px_rgba(27,28,28,0.08)] border border-[#eae7e7] h-[500px] lg:h-[calc(100vh-160px)] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#a63b00]" />
            
            {/* Console Header */}
            <div className="p-4 bg-[#f6f3f2] border-b border-[#eae7e7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#ff5f00] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#a63b00]">Motor Lógico v1.2</span>
              </div>
              <button className="text-stone-400 hover:text-stone-600">
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Console Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-[#ffdbce] text-[#370e00] ml-auto rounded-tr-none font-bold" 
                        : "bg-[#f0eded] text-[#1b1c1c] rounded-tl-none border border-[#e5e2e1]"
                    )}
                  >
                    {msg.content}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isProcessing && (
                <div className="flex gap-1 ml-4 py-2">
                  <div className="w-1.5 h-1.5 bg-[#a63b00] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-[#a63b00] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-[#a63b00] rounded-full animate-bounce" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-[#eae7e7]">
              <form onSubmit={handleProcessInput} className="flex items-center gap-2 bg-[#f6f3f2] p-2 rounded-xl border border-[#e5e2e1] focus-within:border-[#a63b00] transition-all">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ex: Entreguei botas para Ricardo Silva, CPF 452..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold px-2 placeholder:text-stone-400"
                />
                <button 
                  type="submit"
                  disabled={isProcessing || !userInput.trim()}
                  className="w-10 h-10 bg-[#a63b00] text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <p className="text-[9px] text-center mt-3 font-black uppercase text-stone-400 tracking-widest opacity-60">Sincronizado via Digital Foreman Labs</p>
            </div>
          </div>
        </aside>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="fixed md:hidden bottom-0 left-0 w-full z-50 bg-[#fcf9f8]/95 backdrop-blur-sm border-t-2 border-[#eae7e7] pb-6 pt-2">
        <div className="flex justify-around items-center px-4">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="Histórico" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings />} label="Config" />
        </div>
      </nav>

      {/* Desktop Sidebar Nav (Floating) */}
      <div className="hidden md:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col gap-6 p-2 bg-[#f6f3f2] border-2 border-[#eae7e7] rounded-2xl shadow-xl z-50">
        <DesktopNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} title="Dashboard" />
        <DesktopNavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} title="Histórico" />
        <DesktopNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings />} title="Configurações" />
      </div>

      {/* Global FAB (Contextual) */}
      <button className="fixed bottom-28 md:bottom-8 right-8 w-16 h-16 bg-[#ba1a1a] text-white rounded-full flex items-center justify-center shadow-xl shadow-red-200 z-50 active:scale-90 transition-all group overflow-hidden">
        <AlertTriangle className="w-8 h-8 relative z-10" />
        <div className="absolute inset-0 bg-[#93000a] opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
}

function StatCard({ label, value, trend, icon, color }: { label: string, value: string, trend?: string, icon: ReactNode, color: string }) {
  const colorClasses = {
    orange: "text-[#a63b00] bg-[#a63b00]/10",
    blue: "text-[#1d5fa8] bg-[#1d5fa8]/10",
    red: "text-[#ba1a1a] bg-[#ba1a1a]/10",
    stone: "text-[#5b4137] bg-[#5b4137]/10"
  }[color as keyof typeof colorClasses];

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#eae7e7] relative overflow-hidden group hover:shadow-lg transition-all">
      <div className="absolute top-0 left-0 w-1 h-full bg-stone-100 group-hover:bg-[#a63b00] transition-colors" />
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110", colorClasses)}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#5b4137] mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-3xl font-black tracking-tighter text-[#1b1c1c]">{value}</h4>
        {trend && <span className="text-[10px] font-bold text-emerald-600">{trend}</span>}
      </div>
    </div>
  );
}

function ActivityItem({ record }: { record: DeliveryRecord, key?: string }) {
  const getIcon = () => {
    if (record.epi.includes('Capacete')) return <HardHat className="w-5 h-5" />;
    if (record.epi.includes('Bota')) return <Footprints className="w-5 h-5" />;
    return <ShieldCheck className="w-5 h-5" />;
  };

  return (
    <div className="p-4 flex items-center justify-between group hover:bg-stone-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#f0eded] rounded-lg border border-[#e5e2e1] flex items-center justify-center text-[#5b4137] transition-transform group-hover:scale-105">
          {getIcon()}
        </div>
        <div>
          <p className="text-sm font-bold text-[#1b1c1c]">{record.epi}</p>
          <p className="text-[10px] text-[#5b4137] font-medium leading-none mt-1">
            Entregue a: <span className="font-bold">{record.workerName}</span>
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black text-[#a63b00] uppercase tracking-tighter">Troca: {format(parseISO(record.nextReplacementDate), 'dd/MM/yy')}</p>
        <p className="text-[9px] text-stone-400 font-bold uppercase mt-1">{format(record.timestamp, 'HH:mm')}</p>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-90",
        active ? "bg-[#eae7e7] text-[#a63b00]" : "text-stone-400"
      )}
    >
      <span className="w-6 h-6">{icon}</span>
      <span className="text-[8px] font-bold uppercase tracking-widest mt-1">{label}</span>
    </button>
  );
}

function DesktopNavItem({ active, onClick, icon, title }: { active: boolean, onClick: () => void, icon: ReactNode, title: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:bg-white active:scale-95 group relative",
        active ? "bg-[#a63b00] text-white shadow-lg" : "text-[#5b4137]"
      )}
    >
      <span className="w-6 h-6">{icon}</span>
      <div className="absolute left-full ml-4 px-3 py-1 bg-[#1b1c1c] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
        {title}
      </div>
    </button>
  );
}

function ConfigItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#f6f3f2] rounded-xl border border-[#eae7e7]">
      <div className="flex items-center gap-3">
        <Construction className="w-5 h-5 text-stone-400" />
        <span className="font-bold text-stone-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input 
          disabled 
          type="text" 
          value={value} 
          className="w-24 bg-white border-b-2 border-[#a63b00] border-t-0 border-x-0 font-black text-center focus:ring-0 text-[#a63b00]"
        />
        <span className="text-[10px] font-black uppercase text-stone-400">Modificar</span>
      </div>
    </div>
  );
}
