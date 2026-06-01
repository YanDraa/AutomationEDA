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

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Main",
    items: [
      {
          title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Upload Data",
        url: "/upload-data",
        icon: Upload,
      },
      {
        title: "Data Preview",
        url: "/data-preview",
        icon: Table,
      },
      {
        title: "Descriptive Statistics",
        url: "/descriptive-statistics",
        icon: PieChart,
        subItems: [
          {
            title: "Numerical",
            url: "/descriptive-statistics/numerical",
          },
          {
            title: "Categorical",
            url: "/descriptive-statistics/categorical",
          },
        ],
      },
      {
        title: "Visualizations",
        url: "/visualizations",
        icon: BarChart2,
        subItems: [
          {
            title: "Univariate",
            url: "/visualizations/univariate",
          },
          {
            title: "Bivariate",
            url: "/visualizations/bivariate",
          },
          {
            title: "Multivariate",
            url: "/visualizations/multivariate",
          },
          {
            title: "Time Series",
            url: "/visualizations/time-series",
            isNew: true,
          },
        ],
      },
      {
        title: "Interpretation",
        url: "/interpretation",
        icon: Sparkles,
      },
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
      },
      {
        title: "Download",
        url: "/download",
        icon: Download,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ],
  },
];


