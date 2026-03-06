export interface MockAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  district: string;
  emergencyContact: string;
  password: string;
}

export const mockAccounts: MockAccount[] = [
  {
    id: '1',
    name: 'Nguyen Thi Lan',
    email: 'lan.nguyen@vnflood.vn',
    phone: '0909 123 456',
    district: 'Dong Da, Ha Noi',
    emergencyContact: 'Tran Minh Quan - 0912 222 333',
    password: 'lan2026',
  },
  {
    id: '2',
    name: 'Pham Duc Huy',
    email: 'huy.pham@vnflood.vn',
    phone: '0988 456 789',
    district: 'Ninh Kieu, Can Tho',
    emergencyContact: 'Pham Thi Hoa - 0977 111 999',
    password: 'huy2026',
  },
];
