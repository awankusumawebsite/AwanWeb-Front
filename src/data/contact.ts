import type { ContactInfo } from '../lib/site-data';

export interface ContactFaq {
  id: number | string;
  question: string;
  answer: string;
  order: number;
}

export const fallbackContactInfo: Required<ContactInfo> = {
  whatsapp: '6285159358044',
  whatsapp_display: '+62 851-5935-8044',
  email: 'awankusumalegalitas@gmail.com',
  address: 'Ruko Terrace 9, Suvarna Sutera, Jl. Jati Utama No.12, Wanakerta, Sindang Jaya, Kab. Tangerang, Banten 15560',
  maps_url: 'https://maps.app.goo.gl/B6F9RYwgR6sLabGX7',
  maps_embed: 'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d15866!2d106.4370176!3d-6.2521344!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e4201cad3a1de49%3A0x4930046e3f1fc114!2sAwan%20Kusuma%20Legalitas!5e0!3m2!1sid!2sid',
  hours: 'Senin – Jumat, 09.00 – 17.00 WIB',
};

export const fallbackContactFaqs: ContactFaq[] = [
  {
    id: 1,
    question: 'Berapa lama proses pendirian PT?',
    answer: 'Proses pendirian PT umumnya memakan waktu 7–14 hari kerja, bergantung pada kelengkapan dokumen dan antrean di instansi terkait. Tim kami akan memandu Anda dari awal hingga akta terbit.',
    order: 1,
  },
  {
    id: 2,
    question: 'Dokumen apa saja yang dibutuhkan untuk mendirikan PT?',
    answer: 'Dokumen dasar yang dibutuhkan antara lain KTP dan NPWP seluruh pendiri dan direktur, rencana modal, pilihan nama PT, serta alamat domisili usaha.',
    order: 2,
  },
  {
    id: 3,
    question: 'Apakah saya perlu hadir langsung ke kantor Anda?',
    answer: 'Tidak perlu. Konsultasi dan pengumpulan dokumen dapat dilakukan secara daring. Tim kami akan menjelaskan apabila proses tertentu membutuhkan kehadiran atau kuasa khusus.',
    order: 3,
  },
  {
    id: 4,
    question: 'Apakah ada biaya tersembunyi di luar paket yang tertera?',
    answer: 'Tidak ada. Rincian biaya akan dijelaskan secara transparan sebelum proses dimulai.',
    order: 4,
  },
  {
    id: 5,
    question: 'Bagaimana cara memulai konsultasi?',
    answer: 'Klik tombol WhatsApp atau isi formulir konsultasi pada halaman ini. Tim kami akan menghubungi Anda kembali pada jam kerja.',
    order: 5,
  },
];

export function normalizeContactInfo(value: ContactInfo): Required<ContactInfo> {
  return {
    whatsapp: value.whatsapp || fallbackContactInfo.whatsapp,
    whatsapp_display: value.whatsapp_display || fallbackContactInfo.whatsapp_display,
    email: value.email || fallbackContactInfo.email,
    address: value.address || fallbackContactInfo.address,
    maps_url: value.maps_url || fallbackContactInfo.maps_url,
    maps_embed: value.maps_embed || fallbackContactInfo.maps_embed,
    hours: value.hours || fallbackContactInfo.hours,
  };
}
