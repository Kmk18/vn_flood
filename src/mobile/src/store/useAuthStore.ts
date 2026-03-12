import { create } from 'zustand';
import { mockAccounts, MockAccount } from '../mock/accounts';

interface AuthState {
  isAuthenticated: boolean;
  user: MockAccount | null;
  accounts: MockAccount[];
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  accounts: mockAccounts,
  login: (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const matchedAccount = mockAccounts.find(
      (account) => account.email.toLowerCase() === normalizedEmail && account.password === password
    );

    if (!matchedAccount) {
      return { success: false, error: 'Email hoặc mật khẩu không đúng.' };
    }

    set({ isAuthenticated: true, user: matchedAccount });
    return { success: true };
  },
  signup: (name, email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const accountExists = mockAccounts.some((account) => account.email.toLowerCase() === normalizedEmail);
    if (accountExists) {
      return { success: false, error: 'Email đã tồn tại. Vui lòng dùng email khác.' };
    }

    const newAccount: MockAccount = {
      id: (mockAccounts.length + 1).toString(),
      name: normalizedName,
      email: normalizedEmail,
      phone: '',
      district: '',
      emergencyContact: '',
      password,
    };

    mockAccounts.push(newAccount);
    set({ isAuthenticated: true, user: newAccount, accounts: [...mockAccounts] });
    return { success: true };
  },
  logout: () => set({ isAuthenticated: false, user: null }),
}));
