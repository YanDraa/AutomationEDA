import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BarChartBig,
  Boxes,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  PieChart,
  Radar,
  Settings,
  Sparkles,
  Table,
  TrendingUp,
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
        url: "/main/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Upload Data",
        url: "/main/upload-data",
        icon: Upload,
      },
      {
        title: "Data Preview",
        url: "/main/data-preview",
        icon: Table,
      },
      {
        title: "Descriptive Statistics",
        url: "/main/descriptive-statistics",
        icon: PieChart,
        subItems: [
          {
            title: "Numerical",
            url: "/main/descriptive-statistics/numerical",
          },
          {
            title: "Categorical",
            url: "/main/descriptive-statistics/categorical",
          },
        ],
      },
      {
        title: "Visualizations",
        url: "/main/visualizations",
        icon: BarChart2,
        subItems: [
          {
            title: "Univariate",
            url: "/main/visualizations/univariate",
          },
          {
            title: "Bivariate",
            url: "/main/visualizations/bivariate",
          },
          {
            title: "Multivariate",
            url: "/main/visualizations/multivariate",
          },
          {
            title: "Time Series",
            url: "/main/visualizations/time-series",
            isNew: true,
          },
        ],
      },
      {
        title: "Interpretation",
        url: "/main/interpretation",
        icon: Sparkles,
      },
      {
        title: "Reports",
        url: "/main/reports",
        icon: FileText,
      },
      {
        title: "Download",
        url: "/main/download",
        icon: Download,
      },
      {
        title: "Settings",
        url: "/main/settings",
        icon: Settings,
      },
    ],
  },
];
