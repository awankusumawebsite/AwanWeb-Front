import type { Locale } from '../config/site';

export interface LoginCopy {
  back: string;
  title: string;
  description: string;
  noticeTitle: string;
  noticeDescription: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  remember: string;
  submit: string;
  submitting: string;
  missing: string;
  failed: string;
  network: string;
  noAccount: string;
  contact: string;
  brandHeading: string;
  brandDescription: string;
}

export const loginCopy: Record<Locale, LoginCopy> = {
  id: {
    back: 'Kembali ke Beranda',
    title: 'Selamat Datang.',
    description: 'Masuk untuk mengakses portal klien atau portal mitra sesuai hak akses Anda.',
    noticeTitle: 'Portal Pengguna & Mitra',
    noticeDescription: 'Kredensial diverifikasi langsung oleh sistem Awan Kusuma Legalitas.',
    email: 'Alamat Email',
    emailPlaceholder: 'nama@perusahaan.com',
    password: 'Kata Sandi',
    remember: 'Ingat Saya',
    submit: 'MASUK KE SISTEM',
    submitting: 'MEMPROSES...',
    missing: 'Silakan masukkan alamat email dan kata sandi Anda.',
    failed: 'Gagal Masuk',
    network: 'Server tidak dapat dihubungi. Periksa koneksi Anda dan coba lagi.',
    noAccount: 'Belum memiliki akun?',
    contact: 'Hubungi tim kami.',
    brandHeading: 'Kendalikan Penuh Aset Legal Anda.',
    brandDescription: 'Pantau proses legalitas, dokumen, dan tagihan dalam satu portal yang aman.',
  },
  en: {
    back: 'Back to Home',
    title: 'Welcome Back.',
    description: 'Sign in to access the client or partner portal for your assigned role.',
    noticeTitle: 'Client & Partner Portal',
    noticeDescription: 'Your credentials are verified directly by Awan Kusuma Legalitas.',
    email: 'Email Address',
    emailPlaceholder: 'name@company.com',
    password: 'Password',
    remember: 'Remember Me',
    submit: 'SIGN IN',
    submitting: 'SIGNING IN...',
    missing: 'Enter your email address and password.',
    failed: 'Sign In Failed',
    network: 'The server cannot be reached. Check your connection and try again.',
    noAccount: 'Do not have an account?',
    contact: 'Contact our team.',
    brandHeading: 'Stay in Control of Your Legal Assets.',
    brandDescription: 'Track legal processes, documents, and invoices in one secure portal.',
  },
  zh: {
    back: '返回首页',
    title: '欢迎回来。',
    description: '登录后根据您的权限访问客户或合作伙伴门户。',
    noticeTitle: '客户与合作伙伴门户',
    noticeDescription: '您的登录信息将由 Awan Kusuma Legalitas 系统直接验证。',
    email: '电子邮箱',
    emailPlaceholder: 'name@company.com',
    password: '密码',
    remember: '记住我',
    submit: '登录系统',
    submitting: '登录中...',
    missing: '请输入电子邮箱和密码。',
    failed: '登录失败',
    network: '无法连接服务器，请检查网络后重试。',
    noAccount: '还没有账户？',
    contact: '联系我们。',
    brandHeading: '全面掌控您的法律资产。',
    brandDescription: '在安全门户中跟踪法律流程、文件和账单。',
  },
};
