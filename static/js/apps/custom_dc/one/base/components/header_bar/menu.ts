export interface MenuSource {
  id: string;
  title: string;
  url: string;
  description: string;
  childContent?: Array<{ title: string; url: string; description?: string }>;
}

export const MenuItems: MenuSource[] = [
  {
    id: "data",
    title: "Data",
    url: "https://data.one.org/tools",
    description:
      "Use our **interactive tools** to explore and analyse millions of development data points seamlessly.",
    childContent: [
      {
        title: "Dashboards",
        url: "https://data.one.org/tools/dashboard",
      },
      {
        title: "Agents",
        url: "https://data.one.org/tools/agent",
      },
      {
        title: "Packages",
        url: "https://data.one.org/tools/package",
      },
      {
        title: "Data Commons Explorers",
        url: "https://data.one.org/tools/dc-explorers",
      },
      {
        title: "Resources",
        url: "https://data.one.org/resources",
      },
      {
        title: "All our tools",
        url: "https://data.one.org/tools",
      },
    ],
  },
  {
    id: "analysis",
    title: "Analysis",
    url: "https://data.one.org/analysis",
    description:
      "Smart **articles** on the economic, political, and social forces shaping the world – and what they mean for Africa and beyond.",
    childContent: [
      {
        title: "Deep Dives",
        url: "https://data.one.org/analysis/type/deep-dive",
        description:
          "In-depth analyses and comprehensive explorations of key topics.",
      },
      {
        title: "Overviews",
        url: "https://data.one.org/analysis/type/overview",
        description:
          "Get the essentials—background, key insights, and framing of major issues.",
      },
      {
        title: "Advocacy",
        url: "https://data.one.org/analysis/type/advocacy",
        description:
          "Actionable insights, policy recommendations, and timely perspectives.",
      },
      {
        title: "Data Insights",
        url: "https://data.one.org/analysis/type/data-insights",
        description:
          "Key findings and trends, straight from the data.",
      },
      {
        title: "All our analysis",
        url: "https://data.one.org/analysis",
        description: "Browse all our articles.",
      },
    ],
  },
  {
    id: "about-us",
    title: "About Us",
    url: "https://data.one.org/about",
    description:
      "We provide cutting-edge data, analysis, and tools so that together we can fight for a more just world.",
    childContent: [
      {
        title: "About Us",
        url: "https://data.one.org/about",
      },
      {
        title: "Our Team",
        url: "https://data.one.org/about/team",
      },
      {
        title: "FAQ",
        url: "https://data.one.org/about/faq",
      },
      {
        title: "Newsletter",
        url: "https://data.one.org/newsletter",
      },
    ],
  },
];

export function prepareMenu(
  menuItems: MenuSource[],
  _primaryWebRoot: string
): MenuSource[] {
  return menuItems;
}
