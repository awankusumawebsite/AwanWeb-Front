/**
 * Ikon layanan dari CMS.
 *
 * Nama `icon_name` disimpan di CMS dan harus identik dengan mapping frontend
 * Next lama agar seluruh surface (Home dan index Layanan) menghasilkan ikon
 * yang sama. Fallback tetap FileText supaya data CMS yang belum punya ikon
 * tidak menghasilkan kartu kosong.
 */
import {
  Activity, ArchiveX, ArrowRight, ArrowUpRight, Award, BadgeCheck, BarChart3,
  BookOpen, Briefcase, Building, Building2, Calculator, CheckCircle, ClipboardEdit,
  Clock, Cloud, CodeSquare, Compass, Database, FileBadge, FileCheck, FileSearch,
  FileSignature, FileSpreadsheet, FileText, Globe, Hash, Key, Landmark, Lock, Mail,
  Map, MapPin, PenTool, Phone, PieChart, Plus, Scale, Settings, ShieldCheck, Star,
  Stethoscope, Target, TrendingUp, UserCheck, Users,
} from 'lucide-react';

const SERVICE_ICON_MAP = {
  Activity, ArchiveX, ArrowRight, ArrowUpRight, Award, BadgeCheck, BarChart3,
  BookOpen, Briefcase, Building, Building2, Calculator, CheckCircle, ClipboardEdit,
  Clock, Cloud, CodeSquare, Compass, Database, FileBadge, FileCheck, FileSearch,
  FileSignature, FileSpreadsheet, FileText, Globe, Hash, Key, Landmark, Lock, Mail,
  Map, MapPin, PenTool, Phone, PieChart, Plus, Scale, Settings, ShieldCheck, Star,
  Stethoscope, Target, TrendingUp, UserCheck, Users,
};

export function getServiceIcon(iconName?: string | null) {
  return SERVICE_ICON_MAP[iconName as keyof typeof SERVICE_ICON_MAP] || FileText;
}
