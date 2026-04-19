/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EPIType {
  CAPACETE = 'Capacete',
  BOTAS = 'Botas de Segurança',
  LUVAS = 'Luvas de Vaqueta/Raspa',
  OCULOS = 'Óculos de Proteção',
  AURICULAR = 'Protetor Auricular',
}

export interface EPIDurability {
  years?: number;
  months?: number;
  days?: number;
}

export const DURABILITY_TABLE: Record<EPIType, EPIDurability> = {
  [EPIType.CAPACETE]: { years: 3 },
  [EPIType.BOTAS]: { months: 6 },
  [EPIType.LUVAS]: { days: 15 },
  [EPIType.OCULOS]: { days: 90 },
  [EPIType.AURICULAR]: { days: 30 },
};

export interface DeliveryRecord {
  id: string;
  workerName: string;
  workerCPF: string;
  epi: string;
  deliveryDate: string;
  nextReplacementDate: string;
  timestamp: number;
}
