import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Download,
  FileText,
  LayoutDashboard,
  PieChart,
  Settings,
  Sparkles,
  Table,
  Upload,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

// ✅ Definisikan prefix sekali di sini
const BASE = "/dashboard";

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Main",
    items: [
      {
        title: "Dashboard",
        url: BASE,
        icon: LayoutDashboard,
      },
      {
        title: "Upload Data",
        url: `${BASE}/upload-data`,
        icon: Upload,
      },
      {
        title: "Data Preview",
        url: `${BASE}/data-preview`,
        icon: Table,
      },
      {
        title: "Descriptive Statistics",
        url: `${BASE}/descriptive-statistics`,
        icon: PieChart,
        subItems: [
          {
            title: "Numerical",
            url: `${BASE}/descriptive-statistics/numerical`,
          },
          {
            title: "Categorical",
            url: `${BASE}/descriptive-statistics/categorical`,
          },
        ],
      },
      {
        title: "Visualizations",
        url: `${BASE}/visualizations`,
        icon: BarChart2,
        subItems: [
          {
            title: "Univariate",
            url: `${BASE}/visualizations/univariate`,
          },
          {
            title: "Bivariate",
            url: `${BASE}/visualizations/bivariate`,
          },
          {
            title: "Multivariate",
            url: `${BASE}/visualizations/multivariate`,
          },
          {
            title: "Time Series",
            url: `${BASE}/visualizations/time-series`,
            isNew: true,
          },
        ],
      },
      {
        title: "Interpretation",
        url: `${BASE}/interpretation`,
        icon: Sparkles,
      },
      {
        title: "Reports",
        url: `${BASE}/reports`,
        icon: FileText,
      },
      {
        title: "Download",
        url: `${BASE}/download`,
        icon: Download,
      },
    ],
  },
];