import { addDays, addMonths, addYears, format, parseISO } from 'date-fns';
import { DURABILITY_TABLE, EPIType, EPIDurability } from '../types';

export function calculateReplacementDate(deliveryDate: string, epi: string): string {
  const date = parseISO(deliveryDate);
  const durability = Object.entries(DURABILITY_TABLE).find(([key]) => 
    epi.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(epi.toLowerCase())
  )?.[1] as EPIDurability | undefined;

  if (!durability) {
    throw new Error('EPI_NOT_FOUND');
  }

  let nextDate = date;
  if (durability.years) nextDate = addYears(nextDate, durability.years);
  if (durability.months) nextDate = addMonths(nextDate, durability.months);
  if (durability.days) nextDate = addDays(nextDate, durability.days);

  return format(nextDate, 'yyyy-MM-dd');
}

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.length === 11;
}

export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length <= 11) {
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}
